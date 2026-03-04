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
    pool_size=20,
    max_overflow=10,
    pool_recycle=1800,
    pool_timeout=10,          # max 10s waiting for a free connection (instead of hanging forever)
    connect_args={
        "server_settings": {
            "statement_timeout": "15000",   # 15s max per SQL statement
        },
        "command_timeout": 20,              # 20s max for any asyncpg command
    },
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
    import app.models.admin  # noqa: F401
    import app.models.ai_chat  # noqa: F401
    import app.models.community_pick  # noqa: F401
    import app.models.match_chat  # noqa: F401
    import app.models.express_bet  # noqa: F401

    async with engine.begin() as conn:
        # Create all tables (will not modify existing ones — that's fine,
        # column additions are handled via ALTER TABLE migrations below)
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
            # Country column for user geo tracking
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR",
            "CREATE INDEX IF NOT EXISTS ix_users_country ON users(country)",
            # Traffic source tracking (pwa-1, pwa-2, organic, etc.)
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS traffic_source VARCHAR",
            "CREATE INDEX IF NOT EXISTS ix_users_traffic_source ON users(traffic_source)",
            # A/B funnel assignment (funnel-1, funnel-2, funnel-3)
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS funnel VARCHAR DEFAULT 'funnel-1'",
            "CREATE INDEX IF NOT EXISTS ix_users_funnel ON users(funnel)",
            # Admin reply flag for support chat messages
            "ALTER TABLE support_chat_messages ADD COLUMN IF NOT EXISTS is_admin_reply BOOLEAN DEFAULT FALSE",
            # Admin reply flag for AI chat messages
            "ALTER TABLE ai_chat_messages ADD COLUMN IF NOT EXISTS is_admin_reply BOOLEAN DEFAULT FALSE",
            # ── Performance indexes ──────────────────────────────────
            "CREATE INDEX IF NOT EXISTS ix_predictions_user_created ON predictions(user_id, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS ix_predictions_bet_accuracy ON predictions(bet_type, is_correct)",
            "CREATE INDEX IF NOT EXISTS ix_predictions_league_accuracy ON predictions(league, is_correct)",
            "CREATE INDEX IF NOT EXISTS ix_predictions_verified ON predictions(is_correct, verified_at)",
            "CREATE INDEX IF NOT EXISTS ix_users_premium_status ON users(is_premium, premium_until)",
            "CREATE INDEX IF NOT EXISTS ix_users_cohort ON users(created_at, country)",
            "CREATE INDEX IF NOT EXISTS ix_users_created ON users(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS ix_support_user_created ON support_chat_messages(user_id, created_at DESC)",
            # Admin session takeover table (auto/manual mode per session)
            # Postback logs table
            """CREATE TABLE IF NOT EXISTS postback_logs (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR,
                user_db_id INTEGER,
                source VARCHAR NOT NULL,
                click_id VARCHAR,
                transaction_id VARCHAR,
                event VARCHAR,
                amount FLOAT,
                currency VARCHAR,
                country VARCHAR,
                premium_activated BOOLEAN DEFAULT FALSE,
                error TEXT,
                raw_params TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )""",
            "CREATE INDEX IF NOT EXISTS ix_postback_logs_user_id ON postback_logs(user_id)",
            "CREATE INDEX IF NOT EXISTS ix_postback_logs_created ON postback_logs(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS ix_postback_logs_event ON postback_logs(event)",
            # User ban column
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE",
            # Deeplink split: old users go to match (True), new users go to offer (False)
            # No DEFAULT here so existing rows get NULL — backfill below sets them to TRUE
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS use_deeplink BOOLEAN",
            # Banner clicks table
            """CREATE TABLE IF NOT EXISTS banner_clicks (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR,
                banner VARCHAR NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )""",
            "CREATE INDEX IF NOT EXISTS ix_banner_clicks_banner ON banner_clicks(banner)",
            "CREATE INDEX IF NOT EXISTS ix_banner_clicks_created ON banner_clicks(created_at DESC)",
            # Admin session takeover table
            """CREATE TABLE IF NOT EXISTS admin_session_overrides (
                session_id VARCHAR PRIMARY KEY,
                source_type VARCHAR NOT NULL DEFAULT 'support',
                is_takeover BOOLEAN NOT NULL DEFAULT FALSE,
                admin_email VARCHAR,
                created_at TIMESTAMP DEFAULT NOW()
            )""",
            # Community picks table
            """CREATE TABLE IF NOT EXISTS community_picks (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                match_id VARCHAR NOT NULL,
                pick VARCHAR NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                CONSTRAINT uq_user_match_pick UNIQUE (user_id, match_id)
            )""",
            "CREATE INDEX IF NOT EXISTS ix_community_picks_match ON community_picks(match_id)",
            "CREATE INDEX IF NOT EXISTS ix_community_picks_user ON community_picks(user_id)",
            # Match chat messages table
            """CREATE TABLE IF NOT EXISTS match_chat_messages (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                match_id VARCHAR NOT NULL,
                username VARCHAR NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )""",
            "CREATE INDEX IF NOT EXISTS ix_match_chat_match ON match_chat_messages(match_id)",
            "CREATE INDEX IF NOT EXISTS ix_match_chat_user ON match_chat_messages(user_id)",
            "CREATE INDEX IF NOT EXISTS ix_match_chat_created ON match_chat_messages(created_at DESC)",
            # ── analytics_events indexes (heavily queried by admin dashboard) ──
            "CREATE INDEX IF NOT EXISTS ix_analytics_events_created ON analytics_events(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS ix_analytics_events_user_created ON analytics_events(user_id, created_at DESC)",
        ]

        for migration in migrations:
            try:
                await conn.execute(text("SAVEPOINT mig"))
                await conn.execute(text(migration))
                await conn.execute(text("RELEASE SAVEPOINT mig"))
            except Exception:
                await conn.execute(text("ROLLBACK TO SAVEPOINT mig"))

        # Helper: run a data migration with its own savepoint
        async def safe_exec(sql, params=None):
            try:
                await conn.execute(text("SAVEPOINT data_mig"))
                if params:
                    await conn.execute(text(sql), params)
                else:
                    await conn.execute(text(sql))
                await conn.execute(text("RELEASE SAVEPOINT data_mig"))
                return True
            except Exception:
                await conn.execute(text("ROLLBACK TO SAVEPOINT data_mig"))
                return False

        # Create indexes
        await safe_exec("CREATE INDEX IF NOT EXISTS ix_users_referral_code ON users(referral_code)")
        await safe_exec("CREATE INDEX IF NOT EXISTS ix_users_public_id ON users(public_id)")

        # Generate public_id for existing users who don't have one
        try:
            await conn.execute(text("SAVEPOINT pubid_mig"))
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
            await conn.execute(text("RELEASE SAVEPOINT pubid_mig"))
        except Exception:
            await conn.execute(text("ROLLBACK TO SAVEPOINT pubid_mig"))

        # Backfill defaults
        await safe_exec(
            "UPDATE users SET traffic_source = 'direct' WHERE traffic_source IS NULL"
        )
        await safe_exec(
            "UPDATE users SET use_deeplink = FALSE WHERE use_deeplink IS NULL"
        )
        await safe_exec(
            "UPDATE users SET use_deeplink = FALSE "
            "WHERE use_deeplink = TRUE "
            "AND is_premium = FALSE "
            "AND id NOT IN ("
            "  SELECT DISTINCT user_db_id FROM postback_logs "
            "  WHERE user_db_id IS NOT NULL"
            ")"
        )

        # Backfill funnel=funnel-1 for existing users (keep them on current flow)
        try:
            await conn.execute(text(
                "UPDATE users SET funnel = 'funnel-1' "
                "WHERE funnel IS NULL"
            ))
        except Exception:
            pass

        # Backfill country from phone prefix for existing users
        try:
            await conn.execute(text("""
                UPDATE users SET country = CASE
                    WHEN phone LIKE '+971%' THEN 'AE'
                    WHEN phone LIKE '+380%' THEN 'UA'
                    WHEN phone LIKE '+375%' THEN 'BY'
                    WHEN phone LIKE '+370%' THEN 'LT'
                    WHEN phone LIKE '+351%' THEN 'PT'
                    WHEN phone LIKE '+48%' THEN 'PL'
                    WHEN phone LIKE '+49%' THEN 'DE'
                    WHEN phone LIKE '+47%' THEN 'NO'
                    WHEN phone LIKE '+46%' THEN 'SE'
                    WHEN phone LIKE '+45%' THEN 'DK'
                    WHEN phone LIKE '+44%' THEN 'GB'
                    WHEN phone LIKE '+43%' THEN 'AT'
                    WHEN phone LIKE '+42%' THEN 'CZ'
                    WHEN phone LIKE '+41%' THEN 'CH'
                    WHEN phone LIKE '+40%' THEN 'RO'
                    WHEN phone LIKE '+39%' THEN 'IT'
                    WHEN phone LIKE '+38%' THEN 'RS'
                    WHEN phone LIKE '+36%' THEN 'HU'
                    WHEN phone LIKE '+35%' THEN 'IE'
                    WHEN phone LIKE '+34%' THEN 'ES'
                    WHEN phone LIKE '+33%' THEN 'FR'
                    WHEN phone LIKE '+32%' THEN 'BE'
                    WHEN phone LIKE '+31%' THEN 'NL'
                    WHEN phone LIKE '+30%' THEN 'GR'
                    WHEN phone LIKE '+27%' THEN 'ZA'
                    WHEN phone LIKE '+7%' THEN 'RU'
                    WHEN phone LIKE '+1%' THEN 'US'
                    ELSE NULL
                END
                WHERE country IS NULL AND phone IS NOT NULL
            """))
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
