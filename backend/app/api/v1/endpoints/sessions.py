"""Movement-analysis Session endpoints (stub).

NOTE: stubs return placeholder data; service/DB wiring is a later task.
"""
from fastapi import APIRouter, HTTPException, status

from app.schemas.session import SessionCreate, SessionRead

router = APIRouter()


@router.get("", response_model=list[SessionRead])
async def list_sessions(patient_id: int | None = None, skip: int = 0, limit: int = 50) -> list[dict]:
    """List movement-analysis sessions, optionally filtered by patient."""
    # TODO: delegate to SessionService.list(db, patient_id, skip, limit)
    return []


@router.post("", response_model=SessionRead, status_code=status.HTTP_201_CREATED)
async def create_session(payload: SessionCreate) -> dict:
    """Create a new session."""
    # TODO: delegate to SessionService.create(db, payload)
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Session creation not yet implemented.",
    )


@router.get("/{session_id}", response_model=SessionRead)
async def get_session(session_id: int) -> dict:
    """Get a single session by id."""
    # TODO: delegate to SessionService.get(db, session_id)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")


@router.post("/{session_id}/analyze", response_model=SessionRead)
async def analyze_session(session_id: int) -> dict:
    """Trigger movement analysis for a session (runs the analysis agent)."""
    # TODO: delegate to AgentService.analyze_session(db, session_id)
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Session analysis not yet implemented.",
    )
