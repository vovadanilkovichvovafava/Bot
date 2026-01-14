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
