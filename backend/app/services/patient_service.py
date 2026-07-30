"""Patient service (stub).

Will encapsulate patient CRUD and any patient-specific orchestration
(e.g. aggregating latest session metrics). Not yet wired to the API.
"""
from app.services.base import BaseService


class PatientService(BaseService):
    """Business logic for patients."""

    # TODO: async def list(self, db, skip, limit) -> list[Patient]
    # TODO: async def create(self, db, payload) -> Patient
    # TODO: async def get(self, db, patient_id) -> Patient | None
    # TODO: async def update(self, db, patient_id, payload) -> Patient | None
