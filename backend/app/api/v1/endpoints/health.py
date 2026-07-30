"""Health and liveness probes."""
from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health_check() -> dict:
    """Liveness probe — returns service status."""
    return {"status": "ok", "service": settings.PROJECT_NAME, "version": settings.VERSION}
