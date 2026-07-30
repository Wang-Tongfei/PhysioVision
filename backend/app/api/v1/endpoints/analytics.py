"""Analytics endpoints: recovery trends & clinic KPIs."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from app.core.database import get_db
from app.models.session import RehabSession, SessionStatus
from app.models.patient import Patient
from app.agents.analytics_agent import recovery_trend
from app.models.user import User
from app.models.alert import Alert
from app.agents.therapist_agent import summarize
from app.api.v1.endpoints.auth import current_user
from sqlalchemy import func

router = APIRouter()


@router.get("/patient/{patient_id}/trend")
def patient_trend(
    patient_id: int,
    days: int = 30,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.clinic_id == user.clinic_id)
        .first()
    )
    if not patient:
        from fastapi import HTTPException
        raise HTTPException(404, "Patient not found")
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
def clinic_kpi(
    db: Session = Depends(get_db), user: User = Depends(current_user)
):
    active_patients = (
        db.query(Patient).filter(Patient.clinic_id == user.clinic_id).count()
    )
    sessions_today = (
        db.query(RehabSession)
        .join(Patient, Patient.id == RehabSession.patient_id)
        .filter(Patient.clinic_id == user.clinic_id)
        .filter(RehabSession.started_at >= datetime.now(timezone.utc).date())
        .count()
    )
    active_sessions = (
        db.query(RehabSession)
        .join(Patient, Patient.id == RehabSession.patient_id)
        .filter(
            Patient.clinic_id == user.clinic_id,
            RehabSession.status == SessionStatus.ACTIVE,
        )
        .count()
    )
    avg_quality = (
        db.query(func.avg(RehabSession.movement_quality_score))
        .join(Patient, Patient.id == RehabSession.patient_id)
        .filter(Patient.clinic_id == user.clinic_id)
        .scalar()
    )
    session_count = (
        db.query(RehabSession)
        .join(Patient, Patient.id == RehabSession.patient_id)
        .filter(Patient.clinic_id == user.clinic_id)
        .count()
    )
    alert_count = (
        db.query(Alert)
        .join(Patient, Patient.id == Alert.patient_id)
        .filter(Patient.clinic_id == user.clinic_id)
        .count()
    )
    return {
        "active_patients": active_patients,
        "sessions_today": sessions_today,
        "active_sessions": active_sessions,
        "avg_quality": round(float(avg_quality or 0), 1),
        "alert_rate": round(alert_count / session_count, 3) if session_count else 0.0,
    }


@router.get("/clinic/trend")
def clinic_trend(
    limit: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    rows = (
        db.query(RehabSession)
        .join(Patient, Patient.id == RehabSession.patient_id)
        .filter(Patient.clinic_id == user.clinic_id)
        .order_by(RehabSession.started_at.desc())
        .limit(limit)
        .all()
    )
    rows.reverse()
    return {
        "dates": [
            (row.started_at or row.created_at).strftime("%m-%d")
            for row in rows
        ],
        "quality": [round(float(row.movement_quality_score or 0), 1) for row in rows],
        "rom": [round(float(row.rom_achieved_deg or 0), 1) for row in rows],
        "risk": [round(float(row.risk_score or 0), 1) for row in rows],
    }


@router.get("/clinic/assistant")
def therapist_assistant(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    row = (
        db.query(RehabSession)
        .join(Patient, Patient.id == RehabSession.patient_id)
        .filter(Patient.clinic_id == user.clinic_id)
        .order_by(RehabSession.ended_at.desc(), RehabSession.created_at.desc())
        .first()
    )
    if row is None:
        return {"available": False}
    baseline = (
        db.query(func.avg(RehabSession.movement_quality_score))
        .filter(
            RehabSession.patient_id == row.patient_id,
            RehabSession.id != row.id,
        )
        .scalar()
    )
    score = float(row.risk_score or 0)
    risk = {
        "risk_score": score,
        "tier": "low" if score < 33 else "moderate" if score < 66 else "high",
    }
    result = summarize(
        {
            "movement_quality_score": float(row.movement_quality_score or 0),
            "fatigue_index": float(row.fatigue_index or 0),
            "compensation_detected": bool(row.compensation_detected),
        },
        baseline_quality=float(baseline or 80),
        risk=risk,
    )
    return {
        "available": True,
        "session_id": row.id,
        "patient_id": row.patient_id,
        "patient_name": row.patient.full_name,
        "movement_quality_score": float(row.movement_quality_score or 0),
        "risk_score": score,
        **result,
    }
