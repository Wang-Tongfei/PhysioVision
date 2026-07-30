"""Shared API dependencies."""
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db

# Re-export the database dependency under a clear name.
DbSession = Annotated[Session, Depends(get_db)]


# The authenticated-user dependency is implemented in
# app.api.v1.endpoints.auth.current_user and applied to clinic-scoped endpoints.
