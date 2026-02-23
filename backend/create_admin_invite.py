#!/usr/bin/env python3
"""
Bootstrap script: generates the first admin invite code (role=owner).
Run once on the server:  python create_admin_invite.py

The code is printed to stdout — use it to register in the admin panel.
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta

# Ensure app package is importable
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import engine, Base, async_session_maker
from app.models.admin import AdminInvite, AdminUser  # noqa: registers models


async def main():
    # Create tables if missing
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_maker() as db:
        invite = AdminInvite(
            created_by_id=None,  # bootstrap — no creator
            role="owner",
            expires_at=datetime.utcnow() + timedelta(hours=72),
        )
        db.add(invite)
        await db.commit()
        await db.refresh(invite)

    print()
    print("=" * 50)
    print("  ADMIN INVITE CODE (owner)")
    print("=" * 50)
    print(f"  Code:    {invite.code}")
    print(f"  Role:    {invite.role}")
    print(f"  Expires: {invite.expires_at.isoformat()}")
    print()
    print("  Use this code to register at the admin panel.")
    print("  It will expire in 72 hours.")
    print("=" * 50)
    print()

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
