"""
Схемы для комнаты: создание, обновление, ответ.
"""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from app.models.room import Room


class RoomPhotoResponse(BaseModel):
    """Один элемент в списке фотографий комнаты."""

    id: int
    url: str  # полный URL для отображения (например /uploads/room_photos/...)

    model_config = {"from_attributes": False}


class RoomCreate(BaseModel):
    """Тело запроса создания комнаты (админ)."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    capacity: int = Field(..., ge=1)
    amenities: str | None = None
    region: str | None = None
    city: str | None = None
    district: str | None = None
    address: str | None = None


class RoomUpdate(BaseModel):
    """Тело запроса обновления комнаты (частичное)."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    capacity: int | None = Field(None, ge=1)
    amenities: str | None = None
    region: str | None = None
    city: str | None = None
    district: str | None = None
    address: str | None = None


class RoomResponse(BaseModel):
    """Комната в ответах API."""

    id: int
    name: str
    description: str | None
    capacity: int
    amenities: str | None
    region: str | None
    city: str | None
    district: str | None
    address: str | None
    created_at: datetime
    photos: list[RoomPhotoResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


def room_to_response(room: "Room") -> RoomResponse:
    """Собрать RoomResponse из ORM-модели с URL для фотографий."""
    r = room
    photos = [
        RoomPhotoResponse(id=p.id, url="/uploads/" + p.path)
        for p in sorted(r.photos, key=lambda x: x.id)
    ]
    return RoomResponse(
        id=r.id,
        name=r.name,
        description=r.description,
        capacity=r.capacity,
        amenities=r.amenities,
        region=r.region,
        city=r.city,
        district=r.district,
        address=r.address,
        created_at=r.created_at,
        photos=photos,
    )
