"""Shared API dependencies."""
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db

# Re-export the database dependency under a clear name.
DbSession = Annotated[Session, Depends(get_db)]


# TODO: implement and wire an authenticated-user dependency, e.g.:
#   CurrentUser = Annotated[User, Depends(get_current_user)]
#   async def get_current_user(token: str = Depends(oauth2_scheme)) -> User: ...
