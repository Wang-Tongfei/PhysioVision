"""Report service (stub)."""
from app.services.base import BaseService


class ReportService(BaseService):
    """Business logic for AI-generated reports."""

    # TODO: async def list(self, db, patient_id, skip, limit) -> list[Report]
    # TODO: async def create(self, db, payload) -> Report
    # TODO: async def get(self, db, report_id) -> Report | None
    # TODO: async def generate(self, db, patient_id, session_id) -> Report  # calls AgentService
