"""Alert endpoints (risk agent outputs)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.alert import Alert
from app.schemas.alert import AlertOut

router = APIRouter()


@router.get("", response_model=list[AlertOut])
def list_alerts(unack: bool = False, db: Session = Depends(get_db)):
    q = db.query(Alert)
    if unack:
        q = q.filter(Alert.acknowledged.is_(False))
    return q.order_by(Alert.created_at.desc()).limit(50).all()


@router.post("/{alert_id}/acknowledge", response_model=AlertOut)
def acknowledge(alert_id: int, db: Session = Depends(get_db)):
    a = db.get(Alert, alert_id)
    if not a:
        from fastapi import HTTPException
        raise HTTPException(404, "Alert not found")
    a.acknowledged = True
    db.commit()
    db.refresh(a)
    return a
