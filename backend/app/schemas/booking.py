"""
Схемы для бронирования: создание, ответ.
"""
from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class BookingCreate(BaseModel):
    """Тело запроса создания бронирования."""

    room_id: int = Field(..., ge=1)
    start_time: datetime
    end_time: datetime

    @model_validator(mode="after")
    def end_after_start(self) -> "BookingCreate":
        if self.end_time <= self.start_time:
            raise ValueError("end_time должно быть позже start_time")
        return self


class BookingResponse(BaseModel):
    """Бронирование в ответах API."""

    id: int
    user_id: int
    room_id: int
    start_time: datetime
    end_time: datetime
    created_at: datetime

    model_config = {"from_attributes": True}
