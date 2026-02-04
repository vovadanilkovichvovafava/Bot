from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from typing import AsyncGenerator
import os
import logging

logger = logging.getLogger(__name__)

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

engine = create_async_engine(DATABASE_URL, echo=False)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def run_migrations(conn):
    """Run manual migrations for new columns"""
    migrations = [
        # Add last_request_date column to users table for daily limit reset tracking
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'last_request_date'
            ) THEN
                ALTER TABLE users ADD COLUMN last_request_date DATE;
            END IF;
        END $$;
        """,
        # Increase column sizes in predictions table to prevent truncation errors
        """
        DO $$
        BEGIN
            -- Increase match_id from VARCHAR(50) to VARCHAR(100)
            ALTER TABLE predictions ALTER COLUMN match_id TYPE VARCHAR(100);
            -- Increase home_team from VARCHAR(100) to VARCHAR(150)
            ALTER TABLE predictions ALTER COLUMN home_team TYPE VARCHAR(150);
            -- Increase away_team from VARCHAR(100) to VARCHAR(150)
            ALTER TABLE predictions ALTER COLUMN away_team TYPE VARCHAR(150);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors if columns don't exist yet or already modified
            NULL;
        END $$;
        """,
        # ===== ML SYSTEM INDEXES =====
        # Create indexes for ml_training_data table for faster queries
        """
        DO $$
        BEGIN
            -- Index on bet_category for filtering training data by category
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ml_training_category') THEN
                CREATE INDEX idx_ml_training_category ON ml_training_data(bet_category);
            END IF;
            -- Index on target for filtering verified/unverified data
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ml_training_target') THEN
                CREATE INDEX idx_ml_training_target ON ml_training_data(target);
            END IF;
            -- Composite index for common query pattern
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ml_training_category_target') THEN
                CREATE INDEX idx_ml_training_category_target ON ml_training_data(bet_category, target);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END $$;
        """,
        # Create indexes for predictions table
        """
        DO $$
        BEGIN
            -- Index on user_id for user's prediction history
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_predictions_user_id') THEN
                CREATE INDEX idx_predictions_user_id ON predictions(user_id);
            END IF;
            -- Index on match_id for finding predictions by match
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_predictions_match_id') THEN
                CREATE INDEX idx_predictions_match_id ON predictions(match_id);
            END IF;
            -- Index on is_correct for analytics queries
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_predictions_is_correct') THEN
                CREATE INDEX idx_predictions_is_correct ON predictions(is_correct);
            END IF;
            -- Index on bet_category for ML queries
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_predictions_bet_category') THEN
                CREATE INDEX idx_predictions_bet_category ON predictions(bet_category);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END $$;
        """,
        # Create indexes for roi_analytics table
        """
        DO $$
        BEGIN
            -- Composite index for common query pattern
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_roi_category_condition') THEN
                CREATE INDEX idx_roi_category_condition ON roi_analytics(bet_category, condition_key);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END $$;
        """,
        # Create indexes for confidence_calibration table
        """
        DO $$
        BEGIN
            -- Composite index for calibration lookup
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_calibration_category_band') THEN
                CREATE INDEX idx_calibration_category_band ON confidence_calibration(bet_category, confidence_band);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END $$;
        """,
        # Create indexes for learning_log table
        """
        DO $$
        BEGIN
            -- Index on event_type for filtering events
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_learning_log_event_type') THEN
                CREATE INDEX idx_learning_log_event_type ON learning_log(event_type);
            END IF;
            -- Index on created_at for time-based queries
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_learning_log_created_at') THEN
                CREATE INDEX idx_learning_log_created_at ON learning_log(created_at);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END $$;
        """,
        # Create indexes for league_learning table
        """
        DO $$
        BEGIN
            -- Index on league_code for filtering by league
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_league_learning_league') THEN
                CREATE INDEX idx_league_learning_league ON league_learning(league_code);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END $$;
        """,
        # Create indexes for cached_ai_responses table
        """
        DO $$
        BEGIN
            -- Index on expires_at for cache cleanup
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cached_ai_expires') THEN
                CREATE INDEX idx_cached_ai_expires ON cached_ai_responses(expires_at);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END $$;
        """,
    ]

    for migration in migrations:
        try:
            await conn.execute(text(migration))
            logger.info("Migration executed successfully")
        except Exception as e:
            logger.warning(f"Migration warning (may already exist): {e}")


async def init_db():
    """Create all tables and run migrations"""
    async with engine.begin() as conn:
        # Create tables
        await conn.run_sync(Base.metadata.create_all)

        # Run migrations for new columns
        await run_migrations(conn)

    logger.info("Database initialized with migrations")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting database session"""
    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
