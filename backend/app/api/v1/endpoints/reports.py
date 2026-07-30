"""AI report & SOAP endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.report import Report
from app.schemas.report import SoapNoteIn, ReportOut
from app.agents.soap_agent import draft_soap
from app.models.patient import Patient
from app.models.user import User
from app.api.v1.endpoints.auth import current_user

router = APIRouter()


@router.get("", response_model=list[ReportOut])
def list_reports(
    patient_id: int = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    q = (
        db.query(Report)
        .join(Patient, Patient.id == Report.patient_id)
        .filter(Patient.clinic_id == user.clinic_id)
    )
    if patient_id:
        q = q.filter(Report.patient_id == patient_id)
    return q.order_by(Report.created_at.desc()).limit(50).all()


@router.post("/soap", response_model=ReportOut, status_code=201)
def create_soap(
    payload: SoapNoteIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == payload.patient_id, Patient.clinic_id == user.clinic_id)
        .first()
    )
    if not patient:
        raise HTTPException(404, "Patient not found")
    # Optionally run the SOAP agent to enrich with structured telemetry.
    obj = Report(
        patient_id=payload.patient_id,
        therapist_id=payload.therapist_id,
        session_id=payload.session_id,
        title="SOAP Note",
        soap={
            "subjective": payload.subjective,
            "objective": payload.objective,
            "assessment": payload.assessment,
            "plan": payload.plan,
            "visit_datetime": payload.visit_datetime.isoformat() if payload.visit_datetime else None,
            "author": payload.author,
            "signature": payload.signature,
            "authenticated_at": payload.authenticated_at.isoformat() if payload.authenticated_at else None,
        },
        generated_by="therapist",
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.post("/{session_id}/generate", response_model=ReportOut)
def generate_from_session(
    session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Run the SOAP agent on a completed session's telemetry."""
    from app.models.session import RehabSession
    s = db.get(RehabSession, session_id)
    patient = db.get(Patient, s.patient_id) if s else None
    if not s or not patient or patient.clinic_id != user.clinic_id:
        raise HTTPException(404, "Session not found")
    telemetry = {
        "movement_quality_score": s.movement_quality_score or 0,
        "rom_achieved_deg": s.rom_achieved_deg or 0,
        "rom_target_deg": s.rom_target_deg or 0,
        "total_reps": s.total_reps or 0,
        "compensation_detected": s.compensation_detected,
    }
    soap = draft_soap(telemetry)["soap"]
    obj = Report(
        patient_id=s.patient_id, session_id=session_id,
        title="Auto SOAP", soap=soap, generated_by="soap-agent",
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj
