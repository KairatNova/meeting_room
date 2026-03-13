"""
Схемы отзывов: создание и ответ.
"""
from datetime import datetime

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    """Создание отзыва о комнате."""

    rating: int = Field(..., ge=1, le=10)
    comment: str = Field(..., min_length=3, max_length=2000)


class ReviewResponse(BaseModel):
    """Отзыв в ответах API."""

    id: int
    room_id: int
    user_id: int
    author_name: str
    rating: int
    comment: str
    created_at: datetime

    model_config = {"from_attributes": True}
