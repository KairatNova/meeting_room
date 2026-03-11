"""
Модель переговорной комнаты: название, описание, вместимость, удобства.
"""
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.booking import Booking
    from app.models.room_photo import RoomPhoto


class Room(Base):
    """Переговорная комната."""

    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    amenities: Mapped[str | None] = mapped_column(String(500), nullable=True)  # JSON или строка
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    bookings: Mapped[list["Booking"]] = relationship(
        "Booking",
        back_populates="room",
        lazy="selectin",
    )
    photos: Mapped[list["RoomPhoto"]] = relationship(
        "RoomPhoto",
        back_populates="room",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Room id={self.id} name={self.name}>"
