# Backend (FastAPI + ML pipeline) — Python 3.11.
# Used when the Saturn service "Builder" is set to Dockerfile (bypasses the
# Nixpacks plan generation). Build context is the backend/ directory.
FROM python:3.11-slim

# libgomp1 is required at runtime by xgboost (OpenMP); curl for healthchecks.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first for better layer caching.
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy application source.
COPY . .

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

EXPOSE 8000

# Shell form so ${PORT} (injected by the platform) is expanded at runtime.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
