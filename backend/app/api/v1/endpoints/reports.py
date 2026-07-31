"""AI report & SOAP endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.report import Report
from app.schemas.report import SoapNoteIn, ReportOut
from app.agents.soap_agent import draft_soap
from app.models.patient import Patient
from app.models.session import SessionStatus
from app.models.user import User
from app.api.v1.endpoints.auth import current_user

router = APIRouter()


class DemoSoapRequest(BaseModel):
    patient_name: str = Field(min_length=1, max_length=128)
    movement_quality_score: float = Field(ge=0, le=100)
    risk_score: float = Field(ge=0, le=100)
    total_reps: int = Field(default=10, ge=0, le=1000)
    rom_achieved_deg: float = Field(default=90, ge=0, le=360)
    rom_target_deg: float = Field(default=100, ge=0, le=360)
    subjective: str = Field(default="Demo patient tolerated the session well.", max_length=1000)


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


@router.delete("/{report_id}", status_code=204)
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    report = (
        db.query(Report)
        .join(Patient, Patient.id == Report.patient_id)
        .filter(Report.id == report_id, Patient.clinic_id == user.clinic_id)
        .first()
    )
    if not report:
        raise HTTPException(404, "Report not found")
    if (report.soap or {}).get("authenticated_at"):
        raise HTTPException(409, "Authenticated clinical reports cannot be deleted")
    db.delete(report)
    db.commit()
    return None


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


@router.post("/demo/generate")
def generate_demo_soap(
    payload: DemoSoapRequest,
    user: User = Depends(current_user),
):
    """Generate a real Foundry SOAP draft without writing demo data to the DB."""
    if user.email.lower() != "therapist@clinic.com":
        raise HTTPException(403, "Demo SOAP generation is only available in the demo account")
    telemetry = {
        "movement_quality_score": payload.movement_quality_score,
        "risk_score": payload.risk_score,
        "rom_achieved_deg": payload.rom_achieved_deg,
        "rom_target_deg": payload.rom_target_deg,
        "total_reps": payload.total_reps,
        "fatigue_index": min(100.0, payload.risk_score * 0.6),
        "compensation_detected": payload.risk_score >= 66,
        "patient_name": payload.patient_name,
    }
    result = draft_soap(telemetry, subjective=payload.subjective)
    return {
        "generation_mode": result["generation_mode"],
        "soap": result["soap"],
    }


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
    if (
        s.status != SessionStatus.COMPLETED
        or s.movement_quality_score is None
        or s.risk_score is None
    ):
        raise HTTPException(409, "This session does not contain enough completed movement data")
    existing = db.query(Report).filter(Report.session_id == session_id).first()
    if existing:
        raise HTTPException(409, "A SOAP report already exists for this session")
    telemetry = {
        "movement_quality_score": s.movement_quality_score or 0,
        "rom_achieved_deg": s.rom_achieved_deg or 0,
        "rom_target_deg": s.rom_target_deg or 0,
        "total_reps": s.total_reps or 0,
        "compensation_detected": s.compensation_detected,
    }
    soap = draft_soap(telemetry)["soap"]
    name = user.full_name.strip()
    honorific_name = name if name.lower().startswith(("dr. ", "dr ")) else f"Dr. {name}"
    signer = f"{honorific_name}, PT"
    soap.update({"author": signer, "signature": signer})
    obj = Report(
        patient_id=s.patient_id, session_id=session_id,
        title="Auto SOAP", soap=soap, generated_by="soap-agent",
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj
