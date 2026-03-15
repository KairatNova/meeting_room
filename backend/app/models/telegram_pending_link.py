"""
Одноразовая ссылка для привязки Telegram к пользователю.
Пользователь переходит по t.me/Bot?start=TOKEN → бот получает chat_id и привязывает к user_id.
"""
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class TelegramPendingLink(Base):
    """Токен для ссылки t.me/bot?start=TOKEN; после использования привязываем chat_id к user_id."""

    __tablename__ = "telegram_pending_links"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="telegram_pending_link")
