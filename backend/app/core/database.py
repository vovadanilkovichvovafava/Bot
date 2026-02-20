from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from typing import AsyncGenerator
import os
import secrets
import string

# Get DATABASE_URL from Railway
DATABASE_URL = os.getenv("DATABASE_URL", "")

# Convert postgres:// to postgresql+asyncpg://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Fallback for local development
if not DATABASE_URL:
    DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/betting_bot"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=300,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def init_db():
    """Create all tables and run migrations"""
    # Import all models so they register with Base.metadata
    import app.models.ml_models  # noqa: F401

    async with engine.begin() as conn:
        # === DROP old ML tables that have wrong schema ===
        # These tables existed before our ML pipeline with different/missing columns.
        # create_all won't modify existing tables, so we drop them first.
        # They're empty anyway — no data loss.
        ml_tables_to_recreate = [
            "DROP TABLE IF EXISTS ml_training_data CASCADE",
            "DROP TABLE IF EXISTS league_learning CASCADE",
            "DROP TABLE IF EXISTS ml_models CASCADE",
            "DROP TABLE IF EXISTS cached_ai_responses CASCADE",
            "DROP TABLE IF EXISTS learning_log CASCADE",
            "DROP TABLE IF EXISTS roi_analytics CASCADE",
            "DROP TABLE IF EXISTS confidence_calibration CASCADE",
            "DROP TABLE IF EXISTS feature_error_patterns CASCADE",
            "DROP TABLE IF EXISTS learning_patterns CASCADE",
            "DROP TABLE IF EXISTS ensemble_models CASCADE",
        ]
        for stmt in ml_tables_to_recreate:
            try:
                await conn.execute(text(stmt))
            except Exception:
                pass

        # Now create_all will recreate ML tables with correct schema
        await conn.run_sync(Base.metadata.create_all)

        # Add missing columns (migrations)
        migrations = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_ip VARCHAR",
            # Referral system columns
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR UNIQUE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_id INTEGER REFERENCES users(id)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_bonus_requests INTEGER DEFAULT 0",
            # Public ID for tracking (secure, non-guessable)
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS public_id VARCHAR UNIQUE",
            # Degressive AI chat limits
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_chat_requests INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_chat_request_date TIMESTAMP",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS account_day_number INTEGER DEFAULT 1",
            # Predictions table — add columns expected by Prediction model
            # (table may have been created by another service with different schema)
            "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS league VARCHAR",
            "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS match_date TIMESTAMP",
            "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS predicted_odds DOUBLE PRECISION",
            "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS ai_analysis TEXT",
            "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS api_prediction TEXT",
            "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS actual_home_score INTEGER",
            "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS actual_away_score INTEGER",
            "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP",
            # ML Pipeline tables — additional indexes
            "CREATE INDEX IF NOT EXISTS ix_ml_training_fixture ON ml_training_data(fixture_id)",
            "CREATE INDEX IF NOT EXISTS ix_ml_training_home_team ON ml_training_data(home_team_id)",
            "CREATE INDEX IF NOT EXISTS ix_ml_training_away_team ON ml_training_data(away_team_id)",
            "CREATE INDEX IF NOT EXISTS ix_elo_team_league ON league_learning(team_id, league_id)",
            "CREATE INDEX IF NOT EXISTS ix_ml_models_active ON ml_models(model_name, is_active)",
            "CREATE INDEX IF NOT EXISTS ix_cached_predictions_fixture ON cached_ai_responses(fixture_id)",
            "CREATE INDEX IF NOT EXISTS ix_learning_log_type ON learning_log(event_type, created_at)",
            "CREATE INDEX IF NOT EXISTS ix_roi_analytics_period ON roi_analytics(period, period_start)",
        ]

        for migration in migrations:
            try:
                await conn.execute(text(migration))
            except Exception:
                pass  # Column might already exist

        # Create index for referral_code if not exists
        try:
            await conn.execute(
                text("CREATE INDEX IF NOT EXISTS ix_users_referral_code ON users(referral_code)")
            )
        except Exception:
            pass

        # Create index for public_id if not exists
        try:
            await conn.execute(
                text("CREATE INDEX IF NOT EXISTS ix_users_public_id ON users(public_id)")
            )
        except Exception:
            pass

        # Generate public_id for existing users who don't have one
        try:
            result = await conn.execute(text("SELECT id FROM users WHERE public_id IS NULL"))
            rows = result.fetchall()
            for row in rows:
                chars = string.ascii_lowercase + string.digits
                random_part = ''.join(secrets.choice(chars) for _ in range(12))
                public_id = f"usr_{random_part}"
                await conn.execute(
                    text("UPDATE users SET public_id = :public_id WHERE id = :id"),
                    {"public_id": public_id, "id": row[0]}
                )
        except Exception:
            pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting database session"""
    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
