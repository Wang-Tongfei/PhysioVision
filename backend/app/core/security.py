"""Password, JWT and one-time-token helpers."""
from datetime import datetime, timedelta, timezone
import hashlib
import secrets

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

password_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def create_access_token(
    subject: str, expires_delta: timedelta | None = None, token_type: str = "access"
) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return jwt.encode(
        {"sub": subject, "exp": expire, "type": token_type},
        settings.SECRET_KEY,
        algorithm="HS256",
    )


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    return bool(password_hash) and password_context.verify(password, password_hash)


def create_one_time_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(32)
    return raw, hashlib.sha256(raw.encode("utf-8")).hexdigest()


def hash_one_time_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
