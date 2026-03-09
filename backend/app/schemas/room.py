"""
Схемы для комнаты: создание, обновление, ответ.
"""
from datetime import datetime

from pydantic import BaseModel, Field


class RoomCreate(BaseModel):
    """Тело запроса создания комнаты (админ)."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    capacity: int = Field(..., ge=1)
    amenities: str | None = None


class RoomUpdate(BaseModel):
    """Тело запроса обновления комнаты (частичное)."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    capacity: int | None = Field(None, ge=1)
    amenities: str | None = None


class RoomResponse(BaseModel):
    """Комната в ответах API."""

    id: int
    name: str
    description: str | None
    capacity: int
    amenities: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
