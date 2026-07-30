"""Session service (stub)."""
from app.services.base import BaseService


class SessionService(BaseService):
    """Business logic for movement-analysis sessions."""

    # TODO: async def list(self, db, patient_id, skip, limit) -> list[Session]
    # TODO: async def create(self, db, payload) -> Session
    # TODO: async def get(self, db, session_id) -> Session | None
    # TODO: async def analyze(self, db, session_id) -> Session  # calls AgentService
