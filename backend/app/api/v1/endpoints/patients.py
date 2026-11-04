"""Patient CRUD + profile, history and prescription endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.patient import Patient, RiskTier
from app.models.report import Report
from app.models.session import RehabSession
from app.models.exercise import ExercisePrescription
from app.schemas.patient import PatientCreate, PatientOut
from app.schemas.report import ReportOut
from app.models.user import User
from app.api.v1.endpoints.auth import current_user
from app.services.session_records import DuplicateSession, ingest_uploaded_session, session_summary
from physiosight.session.models import Session as EngineSession

router = APIRouter()


@router.get("", response_model=list[PatientOut])
def list_patients(
    db: Session = Depends(get_db), user: User = Depends(current_user)
):
    return db.query(Patient).filter(Patient.clinic_id == user.clinic_id).all()


@router.post("", response_model=PatientOut, status_code=201)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    duplicate = (
        db.query(Patient)
        .filter(Patient.clinic_id == user.clinic_id, Patient.mrn == payload.mrn)
        .first()
    )
    if duplicate:
        raise HTTPException(409, "This MRN already exists")
    values = payload.model_dump()
    try:
        values["risk_tier"] = RiskTier(values["risk_tier"].lower())
    except ValueError as exc:
        raise HTTPException(422, "Risk tier must be low, moderate, high, or critical") from exc
    obj = Patient(**values, clinic_id=user.clinic_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{patient_id}", status_code=204)
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.clinic_id == user.clinic_id)
        .first()
    )
    if not patient:
        raise HTTPException(404, "Patient not found")
    related = {
        "sessions": db.query(RehabSession).filter(RehabSession.patient_id == patient_id).count(),
        "reports": db.query(Report).filter(Report.patient_id == patient_id).count(),
        "prescriptions": db.query(ExercisePrescription).filter(
            ExercisePrescription.patient_id == patient_id
        ).count(),
    }
    if any(related.values()):
        summary = ", ".join(f"{count} {name}" for name, count in related.items() if count)
        raise HTTPException(
            409,
            f"Patient cannot be deleted because clinical history exists ({summary})",
        )
    db.delete(patient)
    db.commit()
    return None


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    obj = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.clinic_id == user.clinic_id)
        .first()
    )
    if not obj:
        raise HTTPException(404, "Patient not found")
    return obj


@router.get("/{patient_id}/history", response_model=list[ReportOut])
def patient_history(
    patient_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.clinic_id == user.clinic_id)
        .first()
    )
    if not patient:
        raise HTTPException(404, "Patient not found")
    return db.query(Report).filter(Report.patient_id == patient_id).all()


def _clinic_patient(db: Session, user: User, patient_id: int) -> Patient:
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.clinic_id == user.clinic_id)
        .first()
    )
    if not patient:
        raise HTTPException(404, "Patient not found")
    return patient


@router.post("/{patient_id}/sessions", status_code=201)
def upload_session(
    patient_id: int,
    session: EngineSession,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Store a Session produced by the physiosight engine on the patient's device.

    The body is the Session JSON exactly as written by ``physiosight analyze -o``
    or ``physiosight run --sessions-dir``; it is validated against the engine's
    own model (including its cross-field consistency checks).
    """
    _clinic_patient(db, user, patient_id)
    try:
        row = ingest_uploaded_session(db, patient_id, session)
    except DuplicateSession:
        raise HTTPException(409, "This session has already been uploaded")
    return session_summary(row)


@router.get("/{patient_id}/sessions", response_model=list[dict])
def patient_sessions(
    patient_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Most recent sessions first."""
    _clinic_patient(db, user, patient_id)
    rows = (
        db.query(RehabSession)
        .filter(RehabSession.patient_id == patient_id)
        .order_by(RehabSession.started_at.desc())
        .limit(max(1, min(limit, 200)))
        .all()
    )
    return [session_summary(r) for r in rows]


@router.get("/{patient_id}/progress")
def patient_progress(
    patient_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Per-exercise time series over all stored engine Sessions, oldest first."""
    _clinic_patient(db, user, patient_id)
    rows = (
        db.query(RehabSession)
        .filter(RehabSession.patient_id == patient_id, RehabSession.analysis.isnot(None))
        .order_by(RehabSession.started_at)
        .all()
    )
    exercises: dict[str, dict] = {}
    for row in rows:
        item = session_summary(row)
        key = item["exercise"] or "unknown"
        entry = exercises.setdefault(key, {"exercise": key, "sessions": [], "fault_totals": {}})
        entry["sessions"].append({
            "id": item["id"],
            "date": item["started_at"],
            "achieved": item["achieved"],
            "attempts": item["attempts"],
            "target": item["target"],
            "rom_achieved_deg": item["rom_achieved_deg"],
            "rom_target_deg": item["rom_target_deg"],
            "movement_quality_score": item["movement_quality_score"],
            "fatigue_index": item["fatigue_index"],
            "fault_counts": item["fault_counts"],
        })
        for code, n in item["fault_counts"].items():
            entry["fault_totals"][code] = entry["fault_totals"].get(code, 0) + n
    return {"patient_id": patient_id, "exercises": list(exercises.values())}
