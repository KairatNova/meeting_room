"""
Модель пользователя: авторизация и роль админа.
"""
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.booking import Booking
    from app.models.email_verification import EmailVerificationCode
    from app.models.login_verification_code import LoginVerificationCode
    from app.models.room_review import RoomReview
    from app.models.telegram_pending_link import TelegramPendingLink


class User(Base):
    """Пользователь системы: авторизация и профиль."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Отображаемое имя (может отличаться от полного)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Профильные поля
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # Telegram: для отправки кодов верификации и сброса пароля (Bot API шлёт только по chat_id)
    telegram_username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    telegram_chat_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    birth_date: Mapped[date | None] = mapped_column(nullable=True)
    gender: Mapped[str | None] = mapped_column(String(16), nullable=True)
    citizenship: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Связь с бронированиями (ленивая загрузка)
    bookings: Mapped[list["Booking"]] = relationship(
        "Booking",
        back_populates="user",
        lazy="selectin",
    )
    # Код подтверждения email (одна запись на пользователя, пока не верифицирован)
    email_verification_code: Mapped["EmailVerificationCode | None"] = relationship(
        "EmailVerificationCode",
        back_populates="user",
        uselist=False,
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    login_verification_code: Mapped["LoginVerificationCode | None"] = relationship(
        "LoginVerificationCode",
        back_populates="user",
        uselist=False,
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    telegram_pending_link: Mapped["TelegramPendingLink | None"] = relationship(
        "TelegramPendingLink",
        back_populates="user",
        uselist=False,
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    room_reviews: Mapped[list["RoomReview"]] = relationship(
        "RoomReview",
        back_populates="user",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email}>"
