"""
Проверка пересечения бронирований по комнате и интервалу времени.
Два слота пересекаются: start_time < existing.end_time AND end_time > existing.start_time.
"""
from datetime import datetime
from datetime import timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.booking import Booking


def has_booking_conflict(
    db: Session,
    room_id: int,
    start_time: datetime,
    end_time: datetime,
    exclude_booking_id: Optional[int] = None,
    buffer_minutes: int = 0,
) -> bool:
    """
    Проверить, есть ли в комнате room_id бронирование, пересекающееся с [start_time, end_time].
    exclude_booking_id — не учитывать бронь с этим id (для редактирования).
    Возвращает True при наличии конфликта.
    """
    buffer_delta = timedelta(minutes=max(0, buffer_minutes))
    check_start = start_time - buffer_delta
    check_end = end_time + buffer_delta

    stmt = (
        select(Booking.id)
        .where(Booking.room_id == room_id)
        .where(Booking.start_time < check_end)
        .where(Booking.end_time > check_start)
        .limit(1)
    )
    if exclude_booking_id is not None:
        stmt = stmt.where(Booking.id != exclude_booking_id)
    return db.execute(stmt).scalar_one_or_none() is not None
