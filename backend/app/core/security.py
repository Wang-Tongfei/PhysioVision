"""Authentication helpers (JWT stub).

This module provides token creation utilities. Full user verification and
the `get_current_user` dependency live in `app.api.deps` and are wired in
a later task — for now these are minimal stubs.
"""
from datetime import datetime, timedelta, timezone

from jose import jwt

from app.core.config import settings


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT access token for the given subject (user id)."""
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


# TODO: implement get_current_user dependency (decode JWT, load user, raise 401).
# TODO: implement password hashing helpers (passlib bcrypt).
