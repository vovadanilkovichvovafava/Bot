from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.security import get_current_user
from app.core.database import get_db
from app.models.match_chat import MatchChatMessage
from app.models.user import User

router = APIRouter()

MAX_MESSAGE_LENGTH = 500
MAX_MESSAGES_PER_PAGE = 50


class SendMessageRequest(BaseModel):
    message: str

    @field_validator("message")
    @classmethod
    def validate_message(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        if len(v) > MAX_MESSAGE_LENGTH:
            raise ValueError(f"Message too long (max {MAX_MESSAGE_LENGTH} chars)")
        return v


class ChatMessageResponse(BaseModel):
    id: int
    user_id: int
    username: str
    message: str
    created_at: str


class ChatMessagesResponse(BaseModel):
    messages: List[ChatMessageResponse]
    total: int


@router.post("/{match_id}")
async def send_message(
    match_id: str,
    body: SendMessageRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    db_user = await db.get(User, user_id)
    username = (db_user.username or (db_user.email or "User").split("@")[0]) if db_user else "User"

    msg = MatchChatMessage(
        user_id=user_id,
        match_id=match_id,
        username=username,
        message=body.message,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    return ChatMessageResponse(
        id=msg.id,
        user_id=msg.user_id,
        username=msg.username,
        message=msg.message,
        created_at=msg.created_at.isoformat(),
    )


@router.get("/{match_id}", response_model=ChatMessagesResponse)
async def get_messages(
    match_id: str,
    limit: int = MAX_MESSAGES_PER_PAGE,
    after_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(MatchChatMessage).where(
        MatchChatMessage.match_id == match_id
    )

    if after_id:
        query = query.where(MatchChatMessage.id > after_id)

    query = query.order_by(desc(MatchChatMessage.created_at)).limit(min(limit, MAX_MESSAGES_PER_PAGE))

    result = await db.execute(query)
    rows = result.scalars().all()

    # Count total messages for this match
    count_result = await db.execute(
        select(func.count(MatchChatMessage.id)).where(
            MatchChatMessage.match_id == match_id
        )
    )
    total = count_result.scalar() or 0

    messages = [
        ChatMessageResponse(
            id=row.id,
            user_id=row.user_id,
            username=row.username,
            message=row.message,
            created_at=row.created_at.isoformat(),
        )
        for row in reversed(rows)  # Return in chronological order
    ]

    return ChatMessagesResponse(messages=messages, total=total)
