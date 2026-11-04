"""Turning engine Sessions into stored rehabilitation sessions.

One implementation for both ways a Session reaches the platform:

* the server-side monitor (camera, browser frames, uploaded video), and
* a Session JSON uploaded by the patient's device (``physiosight analyze``
  or ``physiosight run --sessions-dir``) through
  ``POST /api/v1/patients/{id}/sessions``.

Dashboard metrics are derived from the Session itself (per-repetition
outcomes and angle extrema), so a session gets the same numbers whichever
way it arrived.
"""
from __future__ import annotations

import statistics
from collections import Counter
from datetime import datetime, timedelta, timezone

from app.agents.risk_agent import assess
from app.agents.therapist_agent import summarize

# Range-of-motion targets shown next to rom_achieved_deg (degrees of peak flexion;
# body-line angle for the plank).
ROM_TARGETS = {
    "bicep_curl": 70.0,
    "squat": 80.0,
    "pushup": 70.0,
    "plank": 160.0,
    "shoulder_flexion": 150.0,
}
DEFAULT_ROM_TARGET = 90.0
FATIGUE_MIN_REPS = 4


# ------------------------------------------------------------------ metrics --
def rom_from_session(session, fallback_values: list[float] | None = None) -> float:
    """Range of motion for the dashboard, from per-repetition angle extrema.

    Median over valid repetitions (else all attempts) of the peak flexion
    (``max_deg`` of the recorded ``*_flexion_*`` angles, 0 deg = full extension),
    averaged over sides. Falls back to the spread of the live metric when no
    repetition was attempted, and to its mean for holds (plank body line).
    """
    fallback_values = fallback_values or []
    if session.exercise_kind == "hold":
        return round(statistics.fmean(fallback_values), 1) if fallback_values else 0.0
    reps = [r for r in session.reps if r.outcome == "valid"] or list(session.reps)
    per_rep = []
    for rep in reps:
        peaks = [a.max_deg for name, a in rep.angles.items() if "flexion" in name]
        if peaks:
            per_rep.append(statistics.fmean(peaks))
    if per_rep:
        return round(statistics.median(per_rep), 1)
    if len(fallback_values) > 1:
        return round(max(fallback_values) - min(fallback_values), 1)
    return round(fallback_values[0], 1) if fallback_values else 0.0


def rep_angular_velocity(rep) -> float | None:
    """Mean joint angular velocity of one repetition, in deg/s.

    Excursion of the recorded flexion angles (max - min, averaged over sides)
    divided by the repetition's duration. A camera-only stand-in for the bar
    velocity used in velocity-based training.
    """
    ranges = [a.max_deg - a.min_deg for name, a in rep.angles.items() if "flexion" in name]
    duration = rep.ended_at_s - rep.started_at_s
    if not ranges or duration <= 0:
        return None
    return statistics.fmean(ranges) / duration


def fatigue_from_session(session) -> float | None:
    """Within-set velocity loss (%), used as the dashboard's fatigue index.

    Velocity loss over a set is an established indicator of neuromuscular
    fatigue in resistance training (Sanchez-Medina & Gonzalez-Badillo, Med Sci
    Sports Exerc 2011; 43(9):1725-1734): the fastest of the first two valid
    repetitions is the reference, the mean of the last two is compared with it.
    Here velocity is joint angular velocity from a single camera, so this is a
    proxy that has not been validated for rehabilitation exercises.

    Returns None when it cannot be estimated: holds, or fewer than
    FATIGUE_MIN_REPS valid repetitions.
    """
    if session.exercise_kind == "hold":
        return None
    velocities = [
        v for v in (rep_angular_velocity(r) for r in session.reps if r.outcome == "valid")
        if v is not None
    ]
    if len(velocities) < FATIGUE_MIN_REPS:
        return None
    reference = max(velocities[:2])
    final = statistics.fmean(velocities[-2:])
    if reference <= 0:
        return None
    return round(min(100.0, max(0.0, 100.0 * (reference - final) / reference)), 1)


def quality_from_session(session) -> float:
    """Movement quality score, 0-100: 70% share of correct work, 30% completion.

    Correct work is valid repetitions / attempts, or credited hold time /
    session duration for holds. A platform heuristic, not a clinical score.
    """
    summary = session.summary
    if session.exercise_kind == "hold":
        valid_share = min(1.0, summary.achieved / summary.duration_s) if summary.duration_s > 0 else 0.0
    else:
        valid_share = summary.achieved / summary.attempts if summary.attempts else 0.0
    completion = min(1.0, summary.achieved / summary.target) if summary.target > 0 else 0.0
    return round(100.0 * (0.7 * valid_share + 0.3 * completion), 1)


def fault_counts(session) -> dict[str, int]:
    return dict(Counter(f.code for f in session.faults))


def telemetry_from_session(session, fallback_values: list[float] | None = None) -> dict:
    return {
        "movement_quality_score": quality_from_session(session),
        "rom_achieved_deg": rom_from_session(session, fallback_values),
        "rom_target_deg": ROM_TARGETS.get(session.exercise_id, DEFAULT_ROM_TARGET),
        "total_reps": int(session.summary.achieved) if session.exercise_kind == "repetition" else 0,
        "fatigue_index": fatigue_from_session(session),
        "compensation_detected": bool(session.faults),
    }


def has_valid_data(session) -> bool:
    return session.tracking.frames_with_pose > 0 and session.summary.achieved > 0


# -------------------------------------------------------------- persistence --
def patient_base_risk(db, patient_id: int | None) -> float:
    from app.models.patient import Patient

    if patient_id is None:
        return 20.0
    patient = db.get(Patient, patient_id)
    tier = getattr(patient.risk_tier, "value", patient.risk_tier) if patient else "moderate"
    return {"low": 10.0, "moderate": 35.0, "high": 65.0, "critical": 90.0}.get(str(tier), 35.0)


def patient_baseline(db, patient_id: int | None) -> float:
    from sqlalchemy import func

    from app.models.session import RehabSession

    if patient_id is None:
        return 80.0
    value = (
        db.query(func.avg(RehabSession.movement_quality_score))
        .filter(RehabSession.patient_id == patient_id)
        .scalar()
    )
    return round(float(value or 80.0), 1)


def assess_session(db, patient_id: int | None, telemetry: dict, valid_data: bool):
    """(risk, therapist summary) for valid sessions, (None, None) otherwise."""
    if not valid_data:
        return None, None
    risk = assess(telemetry, base_risk=patient_base_risk(db, patient_id))
    therapist = summarize(telemetry, baseline_quality=patient_baseline(db, patient_id), risk=risk)
    return risk, therapist


def persist_session(
    db,
    *,
    patient_id: int,
    session,
    telemetry: dict,
    risk: dict | None,
    therapist: dict | None,
    valid_data: bool,
    completed: bool,
    source: str,
    started_at: datetime | None = None,
):
    """Store one session row (and an alert when warranted). Returns the row."""
    from app.models.alert import Alert
    from app.models.session import RehabSession, SessionStatus

    ended_at = session.created_at
    if started_at is None:
        started_at = ended_at - timedelta(seconds=session.summary.duration_s)
    row = RehabSession(
        patient_id=patient_id,
        edge_node_id=source,
        camera_id=session.source.kind,
        status=(
            SessionStatus.INSUFFICIENT_DATA
            if not valid_data
            else SessionStatus.COMPLETED if completed else SessionStatus.ABORTED
        ),
        started_at=started_at,
        ended_at=ended_at,
        movement_quality_score=telemetry["movement_quality_score"] if valid_data else None,
        risk_score=risk["risk_score"] if risk else None,
        fatigue_index=telemetry["fatigue_index"] if valid_data else None,
        compensation_detected=telemetry["compensation_detected"] if valid_data else False,
        total_reps=telemetry["total_reps"],
        rom_achieved_deg=telemetry["rom_achieved_deg"],
        rom_target_deg=telemetry["rom_target_deg"],
        evidence_clip_url=f"exercise:{session.exercise_id}",
        engine_session_id=str(session.session_id),
        analysis=session.model_dump(mode="json"),
    )
    db.add(row)
    db.flush()
    if risk and therapist and (risk["tier"] != "low" or telemetry["compensation_detected"]):
        db.add(
            Alert(
                session_id=row.id,
                patient_id=patient_id,
                severity="critical" if risk["tier"] == "high" else "warning",
                type="compensation" if telemetry["compensation_detected"] else "risk",
                message=therapist["summary"],
                score=risk["risk_score"],
            )
        )
    return row


class DuplicateSession(Exception):
    pass


def ingest_uploaded_session(db, patient_id: int, session):
    """Store a Session uploaded from a patient device. Commits; returns the row."""
    from app.models.session import RehabSession

    exists = (
        db.query(RehabSession.id)
        .filter(RehabSession.engine_session_id == str(session.session_id))
        .first()
    )
    if exists:
        raise DuplicateSession(str(session.session_id))
    telemetry = telemetry_from_session(session)
    valid = has_valid_data(session)
    risk, therapist = assess_session(db, patient_id, telemetry, valid)
    row = persist_session(
        db, patient_id=patient_id, session=session, telemetry=telemetry, risk=risk,
        therapist=therapist, valid_data=valid, completed=valid, source="upload",
    )
    db.commit()
    db.refresh(row)
    return row


def session_summary(row) -> dict:
    """Compact listing entry for a stored session."""
    analysis = row.analysis or {}
    summary = analysis.get("summary") or {}
    return {
        "id": row.id,
        "engine_session_id": row.engine_session_id,
        "exercise": (row.evidence_clip_url or "").removeprefix("exercise:") or None,
        "source": row.edge_node_id,
        "status": row.status,
        "started_at": row.started_at,
        "ended_at": row.ended_at,
        "achieved": summary.get("achieved", row.total_reps),
        "target": summary.get("target"),
        "attempts": summary.get("attempts"),
        "movement_quality_score": row.movement_quality_score,
        "risk_score": row.risk_score,
        "fatigue_index": row.fatigue_index,
        "rom_achieved_deg": row.rom_achieved_deg,
        "rom_target_deg": row.rom_target_deg,
        "compensation_detected": row.compensation_detected,
        "fault_counts": dict(Counter(f["code"] for f in analysis.get("faults", []))),
        "has_analysis": row.analysis is not None,
    }


def now_utc() -> datetime:
    return datetime.now(timezone.utc)
