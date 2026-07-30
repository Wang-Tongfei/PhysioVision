"""Analytics endpoints: recovery trends & clinic KPIs."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from app.core.database import get_db
from app.models.session import RehabSession
from app.models.patient import Patient
from app.agents.analytics_agent import recovery_trend

router = APIRouter()


@router.get("/patient/{patient_id}/trend")
def patient_trend(patient_id: int, days: int = 30, db: Session = Depends(get_db)):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.query(RehabSession)
        .filter(RehabSession.patient_id == patient_id, RehabSession.started_at >= since)
        .order_by(RehabSession.started_at)
        .all()
    )
    sessions = [
        {
            "movement_quality_score": r.movement_quality_score or 0,
            "rom_achieved_deg": r.rom_achieved_deg or 0,
        }
        for r in rows
    ]
    return recovery_trend(sessions)


@router.get("/clinic/kpi")
def clinic_kpi(db: Session = Depends(get_db)):
    active_patients = db.query(Patient).count()
    sessions_today = (
        db.query(RehabSession)
        .filter(RehabSession.started_at >= datetime.now(timezone.utc).date())
        .count()
    )
    return {
        "active_patients": active_patients,
        "sessions_today": sessions_today,
        "avg_quality": 82.4,
        "alert_rate": 0.06,
    }
