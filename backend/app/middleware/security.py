"""
Security middleware for FastAPI
- Content Security Policy headers
- Rate limiting
- Security logging
"""

import os
import time
import asyncio
import logging
import re
from collections import defaultdict
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("security")
logging.basicConfig(level=logging.INFO)

# Rate limiting storage (in-memory, use Redis in production)
rate_limit_storage: dict[str, list[float]] = defaultdict(list)

# Suspicious patterns for injection detection — PRE-COMPILED for performance
INJECTION_PATTERNS = [
    re.compile(r"<script[^>]*>", re.IGNORECASE),
    re.compile(r"javascript:", re.IGNORECASE),
    re.compile(r"on\w+\s*=", re.IGNORECASE),
    re.compile(r"['\"]\s*or\s*['\"]?\s*\d+\s*=\s*\d+", re.IGNORECASE),
    re.compile(r"union\s+select", re.IGNORECASE),
    re.compile(r"drop\s+table", re.IGNORECASE),
    re.compile(r"insert\s+into", re.IGNORECASE),
    re.compile(r";\s*delete\s+from", re.IGNORECASE),
]

# Pre-computed security headers (avoid re-creating strings on every request)
_SECURITY_HEADERS = {
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://mc.yandex.ru; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self' data:; "
        "connect-src 'self' https://api-football-v1.p.rapidapi.com https://v3.football.api-sports.io https://api.football-data.org https://mc.yandex.ru; "
        "frame-ancestors https://webvisor.com https://*.webvisor.com https://metrika.yandex.ru https://*.metrika.yandex.ru; "
        "base-uri 'self'; "
        "form-action 'self';"
    ),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "ALLOW-FROM https://webvisor.com",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds security headers to all responses"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        response.headers.update(_SECURITY_HEADERS)
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiting
    - 100 requests per minute for general endpoints
    - 20 requests per minute for auth endpoints
    """

    GENERAL_LIMIT = 100
    AUTH_LIMIT = 20
    WINDOW_SECONDS = 60

    # Allowed CORS origins — must match main.py CORS config
    CORS_ORIGINS = {
        "https://prescoreai.com",
        "https://www.prescoreai.com",
        "https://prescore.vip",
        "https://www.prescore.vip",
        "https://prescoreai.vip",
        "https://www.prescoreai.vip",
        "https://sportscoreai.com",
        "https://www.sportscoreai.com",
        "https://pwa-production-20b5.up.railway.app",
        "https://pwa-2-production.up.railway.app",
        "https://appbot-production-152e.up.railway.app",
        "http://localhost:3000",
        "http://localhost:5173",
    }

    # Add extra origins from env for multi-domain deployments
    _extra = os.getenv("EXTRA_CORS_ORIGINS", "")
    if _extra:
        CORS_ORIGINS.update(o.strip() for o in _extra.split(",") if o.strip())

    _cleanup_started = False

    def _cors_headers(self, request: Request) -> dict:
        """Add CORS headers so browser doesn't mask 429 as CORS error"""
        origin = request.headers.get("origin", "")
        if origin in self.CORS_ORIGINS:
            return {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
            }
        return {}

    @staticmethod
    async def _cleanup_loop():
        """Periodically remove stale IP entries to prevent memory leak."""
        while True:
            await asyncio.sleep(3600)  # every hour
            try:
                now = time.time()
                stale_keys = [
                    k for k, v in rate_limit_storage.items()
                    if not v or now - max(v) > 300  # no activity for 5 min
                ]
                for k in stale_keys:
                    del rate_limit_storage[k]
                if stale_keys:
                    logger.debug(f"Rate limit cleanup: removed {len(stale_keys)} stale keys")
            except Exception as e:
                logger.warning(f"Rate limit cleanup error: {e}")

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Start cleanup task once
        if not RateLimitMiddleware._cleanup_started:
            RateLimitMiddleware._cleanup_started = True
            asyncio.create_task(self._cleanup_loop())

        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()

        path = request.url.path
        now = time.time()

        # Skip rate limiting for admin panel entirely
        if path.startswith("/api/v1/admin/"):
            return await call_next(request)

        # Determine limit based on path
        if "/auth/" in path:
            limit = self.AUTH_LIMIT
            key = f"auth:{client_ip}"
        else:
            limit = self.GENERAL_LIMIT
            key = f"general:{client_ip}"

        # Clean old entries
        cutoff = now - self.WINDOW_SECONDS
        rate_limit_storage[key] = [
            t for t in rate_limit_storage[key]
            if t > cutoff
        ]

        # Check limit
        if len(rate_limit_storage[key]) >= limit:
            logger.warning(f"Rate limit exceeded: {client_ip} on {path}")
            return Response(
                content='{"detail": "Rate limit exceeded. Please try again later."}',
                status_code=429,
                media_type="application/json",
                headers={
                    "Retry-After": str(self.WINDOW_SECONDS),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    **self._cors_headers(request),
                }
            )

        # Record request
        rate_limit_storage[key].append(now)

        response = await call_next(request)

        # Add rate limit headers
        remaining = limit - len(rate_limit_storage[key])
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))

        return response


class InjectionDetectionMiddleware(BaseHTTPMiddleware):
    """Logs suspicious requests that may be injection attempts"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Check query parameters
        query_string = str(request.url.query)
        path = request.url.path

        # Check for injection patterns (pre-compiled regex)
        for pattern in INJECTION_PATTERNS:
            if pattern.search(query_string):
                client_ip = request.client.host if request.client else "unknown"
                logger.warning(
                    f"INJECTION ATTEMPT DETECTED | IP: {client_ip} | "
                    f"Path: {path} | Pattern: {pattern.pattern} | Query: {query_string[:200]}"
                )
                break

            if pattern.search(path):
                client_ip = request.client.host if request.client else "unknown"
                logger.warning(
                    f"INJECTION ATTEMPT DETECTED | IP: {client_ip} | "
                    f"Path: {path} | Pattern: {pattern.pattern}"
                )
                break

        return await call_next(request)
