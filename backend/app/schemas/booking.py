"""
Схемы для бронирования: создание, ответ.
"""
from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from app.models.booking import Booking


class BookingCreate(BaseModel):
    """Тело запроса создания бронирования."""

    room_id: int = Field(..., ge=1)
    start_time: datetime
    end_time: datetime


class BookingResponse(BaseModel):
    """Бронирование в ответах API."""

    id: int
    user_id: int
    room_id: int
    start_time: datetime
    end_time: datetime
    created_at: datetime
    room_name: str | None = None

    model_config = {"from_attributes": True}


def booking_to_response(booking: "Booking") -> BookingResponse:
    """Собрать BookingResponse с названием комнаты."""
    return BookingResponse(
        id=booking.id,
        user_id=booking.user_id,
        room_id=booking.room_id,
        start_time=booking.start_time,
        end_time=booking.end_time,
        created_at=booking.created_at,
        room_name=booking.room.name if booking.room else None,
    )
