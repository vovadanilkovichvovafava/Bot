# AI Betting Bot - Backend API

FastAPI backend for the AI Betting Bot mobile application.

## Features

- JWT Authentication
- Match data from Football-Data API
- AI-powered match analysis using Claude
- Machine Learning predictions
- User statistics and favorites
- PostgreSQL database with async SQLAlchemy

## Setup

### Requirements

- Python 3.11+
- PostgreSQL
- API Keys: Football-Data, Claude (Anthropic)

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your settings
```

### Environment Variables

```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/betting_bot
SECRET_KEY=your-super-secret-key
FOOTBALL_API_KEY=your-football-data-api-key
CLAUDE_API_KEY=your-anthropic-api-key
```

### Run Development Server

```bash
uvicorn app.main:app --reload
```

### Run with Docker

```bash
docker build -t betting-bot-api .
docker run -p 8000:8000 --env-file .env betting-bot-api
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
backend/
├── app/
│   ├── api/           # API routes
│   ├── core/          # Security, database
│   ├── models/        # SQLAlchemy models
│   ├── services/      # Business logic
│   └── main.py        # FastAPI app
├── tests/
├── migrations/        # Alembic migrations
├── requirements.txt
└── Dockerfile
```
