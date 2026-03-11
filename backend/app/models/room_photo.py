"""
Модель фотографии комнаты: одна запись — один файл, привязанный к комнате.
"""
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.room import Room


class RoomPhoto(Base):
    """Фотография переговорной комнаты."""

    __tablename__ = "room_images"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    path: Mapped[str] = mapped_column(String(512), nullable=False)  # относительный путь от корня uploads

    room: Mapped["Room"] = relationship("Room", back_populates="photos")
