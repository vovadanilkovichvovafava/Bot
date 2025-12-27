from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.core.security import get_current_user
from app.core.database import async_session_maker
from sqlalchemy import text

router = APIRouter()


class FcmTokenRequest(BaseModel):
    fcm_token: str


class NotificationRequest(BaseModel):
    title: str
    body: str
    data: Optional[dict] = None
    topic: Optional[str] = None  # For topic-based notifications
    user_ids: Optional[List[int]] = None  # For user-specific notifications


@router.post("/register")
async def register_fcm_token(
    request: FcmTokenRequest,
    current_user: dict = Depends(get_current_user)
):
    """Register FCM token for push notifications"""
    user_id = current_user.get("id")

    async with async_session_maker() as session:
        # Check if token already exists for this user
        result = await session.execute(
            text("""
                INSERT INTO fcm_tokens (user_id, token, created_at, updated_at)
                VALUES (:user_id, :token, :now, :now)
                ON CONFLICT (token) DO UPDATE SET
                    user_id = :user_id,
                    updated_at = :now
            """),
            {
                "user_id": user_id,
                "token": request.fcm_token,
                "now": datetime.utcnow()
            }
        )
        await session.commit()

    return {"status": "registered", "token": request.fcm_token[:20] + "..."}


@router.delete("/unregister")
async def unregister_fcm_token(
    request: FcmTokenRequest,
    current_user: dict = Depends(get_current_user)
):
    """Unregister FCM token"""
    async with async_session_maker() as session:
        await session.execute(
            text("DELETE FROM fcm_tokens WHERE token = :token"),
            {"token": request.fcm_token}
        )
        await session.commit()

    return {"status": "unregistered"}


@router.post("/send")
async def send_notification(
    request: NotificationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send push notification (admin only)"""
    # Check if user is admin
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        import firebase_admin
        from firebase_admin import messaging, credentials

        # Initialize Firebase if not already done
        if not firebase_admin._apps:
            # You need to set GOOGLE_APPLICATION_CREDENTIALS env var
            # or provide credentials here
            try:
                cred = credentials.ApplicationDefault()
                firebase_admin.initialize_app(cred)
            except Exception:
                raise HTTPException(
                    status_code=503,
                    detail="Firebase not configured. Set GOOGLE_APPLICATION_CREDENTIALS."
                )

        # Send to topic
        if request.topic:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=request.title,
                    body=request.body,
                ),
                data=request.data or {},
                topic=request.topic,
            )
            response = messaging.send(message)
            return {"status": "sent", "message_id": response}

        # Send to specific users
        if request.user_ids:
            async with async_session_maker() as session:
                result = await session.execute(
                    text("""
                        SELECT token FROM fcm_tokens
                        WHERE user_id = ANY(:user_ids)
                    """),
                    {"user_ids": request.user_ids}
                )
                tokens = [row[0] for row in result.fetchall()]

            if not tokens:
                return {"status": "no_tokens", "message": "No FCM tokens found for users"}

            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=request.title,
                    body=request.body,
                ),
                data=request.data or {},
                tokens=tokens,
            )
            response = messaging.send_multicast(message)
            return {
                "status": "sent",
                "success_count": response.success_count,
                "failure_count": response.failure_count
            }

        raise HTTPException(
            status_code=400,
            detail="Must specify either 'topic' or 'user_ids'"
        )

    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Firebase Admin SDK not installed. Run: pip install firebase-admin"
        )


@router.get("/topics")
async def get_available_topics():
    """Get available notification topics"""
    return {
        "topics": [
            {"id": "league_PL", "name": "Premier League", "description": "Premier League match notifications"},
            {"id": "league_PD", "name": "La Liga", "description": "La Liga match notifications"},
            {"id": "league_BL1", "name": "Bundesliga", "description": "Bundesliga match notifications"},
            {"id": "league_SA", "name": "Serie A", "description": "Serie A match notifications"},
            {"id": "league_FL1", "name": "Ligue 1", "description": "Ligue 1 match notifications"},
            {"id": "league_CL", "name": "Champions League", "description": "Champions League match notifications"},
            {"id": "all_matches", "name": "All Matches", "description": "All match notifications"},
        ]
    }
