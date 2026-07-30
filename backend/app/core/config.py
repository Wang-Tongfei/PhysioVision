"""Application configuration loaded from environment / .env file."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Runtime settings resolved from environment variables.

    Defaults below are suitable for local development. Override via a
    local `.env` file (see `.env.example`) or the host environment.
    """

    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "PhysioVision"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"

    # Frontend origins permitted by the CORS middleware.
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # SQLAlchemy database connection string.
    DATABASE_URL: str = "sqlite:///./physiovision.db"

    # JWT auth placeholders (replace SECRET_KEY in production).
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # Optional Telegram delivery for monitoring alerts and completion notices.
    PHYSIO_TG_TOKEN: str = ""
    PHYSIO_TG_CHAT: str = ""


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()


settings = get_settings()
