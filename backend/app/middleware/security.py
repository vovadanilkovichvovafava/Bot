"""
Security middleware for FastAPI
- Content Security Policy headers
- Rate limiting
- Security logging
"""

import time
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

# Suspicious patterns for injection detection
INJECTION_PATTERNS = [
    r"<script[^>]*>",
    r"javascript:",
    r"on\w+\s*=",
    r"['\"]\s*or\s*['\"]?\s*\d+\s*=\s*\d+",
    r"union\s+select",
    r"drop\s+table",
    r"insert\s+into",
    r";\s*delete\s+from",
]


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds security headers to all responses"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://mc.yandex.ru; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://api-football-v1.p.rapidapi.com https://v3.football.api-sports.io https://api.football-data.org https://mc.yandex.ru; "
            "frame-ancestors https://webvisor.com https://*.webvisor.com https://metrika.yandex.ru https://*.metrika.yandex.ru; "
            "base-uri 'self'; "
            "form-action 'self';"
        )

        # Other security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        # Allow Yandex Metrika webvisor to embed pages in iframe
        response.headers["X-Frame-Options"] = "ALLOW-FROM https://webvisor.com"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=()"
        )

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
        "https://sportscoreai.com",
        "https://www.sportscoreai.com",
        "https://pwa-production-20b5.up.railway.app",
        "http://localhost:3000",
        "http://localhost:5173",
    }

    def _cors_headers(self, request: Request) -> dict:
        """Add CORS headers so browser doesn't mask 429 as CORS error"""
        origin = request.headers.get("origin", "")
        if origin in self.CORS_ORIGINS:
            return {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
            }
        return {}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()

        path = request.url.path
        now = time.time()

        # Determine limit based on path
        if "/auth/" in path:
            limit = self.AUTH_LIMIT
            key = f"auth:{client_ip}"
        else:
            limit = self.GENERAL_LIMIT
            key = f"general:{client_ip}"

        # Clean old entries
        rate_limit_storage[key] = [
            t for t in rate_limit_storage[key]
            if now - t < self.WINDOW_SECONDS
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

        # Check for injection patterns
        for pattern in INJECTION_PATTERNS:
            if re.search(pattern, query_string, re.IGNORECASE):
                client_ip = request.client.host if request.client else "unknown"
                logger.warning(
                    f"INJECTION ATTEMPT DETECTED | IP: {client_ip} | "
                    f"Path: {path} | Pattern: {pattern} | Query: {query_string[:200]}"
                )
                break

            if re.search(pattern, path, re.IGNORECASE):
                client_ip = request.client.host if request.client else "unknown"
                logger.warning(
                    f"INJECTION ATTEMPT DETECTED | IP: {client_ip} | "
                    f"Path: {path} | Pattern: {pattern}"
                )
                break

        return await call_next(request)
