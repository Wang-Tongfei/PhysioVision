"""Shared/common schemas."""
from pydantic import BaseModel


class Message(BaseModel):
    """Generic message envelope (e.g. for errors / actions)."""

    detail: str


class Page(BaseModel):
    """Paginated collection envelope."""

    total: int
    page: int
    page_size: int
