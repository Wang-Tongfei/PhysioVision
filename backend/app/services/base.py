"""Base service interface (stub).

Concrete services will implement CRUD-style methods against the SQLAlchemy
`Session` injected via `app.api.deps.DbSession`. This base exists to
establish a common pattern for service stubs.
"""
from abc import ABC


class BaseService(ABC):
    """Marker base class for service objects."""

    # TODO: add shared helpers (e.g. pagination, commit/refresh) as needed.
