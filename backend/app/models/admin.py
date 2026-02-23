import secrets
import string
from datetime import datetime, timedelta

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


def generate_invite_code():
    """Generate a unique 16-char invite code like adm_Xk9mP2vR7qW4"""
    chars = string.ascii_letters + string.digits
    random_part = ''.join(secrets.choice(chars) for _ in range(12))
    return f"adm_{random_part}"


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)

    role = Column(String, nullable=False, default="admin")  # owner | admin | viewer
    is_active = Column(Boolean, default=True)

    invited_by_id = Column(Integer, ForeignKey("admin_users.id"), nullable=True)
    last_login = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    invited_by = relationship("AdminUser", remote_side=[id], backref="invitees")
    invites_created = relationship(
        "AdminInvite",
        back_populates="created_by",
        foreign_keys="AdminInvite.created_by_id",
    )


class AdminInvite(Base):
    __tablename__ = "admin_invites"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False, default=generate_invite_code)

    created_by_id = Column(Integer, ForeignKey("admin_users.id"), nullable=True)  # null for bootstrap invite
    role = Column(String, nullable=False, default="admin")  # role granted on use

    used_by_id = Column(Integer, ForeignKey("admin_users.id"), nullable=True)
    used_at = Column(DateTime, nullable=True)

    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    created_by = relationship("AdminUser", foreign_keys=[created_by_id], back_populates="invites_created")
    used_by = relationship("AdminUser", foreign_keys=[used_by_id])

    @property
    def is_valid(self) -> bool:
        return (
            self.used_by_id is None
            and self.expires_at > datetime.utcnow()
        )
