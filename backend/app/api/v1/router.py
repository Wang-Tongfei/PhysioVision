"""v1 API router aggregating all endpoint modules."""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    patients, exercises, monitoring, reports, alerts, analytics, clinic,
)

api_router = APIRouter()
api_router.include_router(patients.router, prefix="/patients", tags=["patients"])
api_router.include_router(exercises.router, prefix="/exercises", tags=["exercises"])
api_router.include_router(monitoring.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(clinic.router, prefix="/clinic", tags=["clinic"])
