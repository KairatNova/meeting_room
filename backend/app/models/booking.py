"""
Модель бронирования: пользователь, комната, интервал времени.
Индекс по (room_id, start_time, end_time) ускорит проверку конфликтов.
"""
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.room import Room
    from app.models.user import User


class Booking(Base):
    """Бронирование переговорной комнаты на заданный интервал."""

    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="bookings")
    room: Mapped["Room"] = relationship("Room", back_populates="bookings")

    # Составной индекс для быстрого поиска конфликтов по комнате и времени
    __table_args__ = (
        Index("ix_bookings_room_time", "room_id", "start_time", "end_time"),
    )

    def __repr__(self) -> str:
        return f"<Booking id={self.id} room_id={self.room_id} {self.start_time}–{self.end_time}>"
