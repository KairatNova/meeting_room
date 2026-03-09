"""
Модель кода подтверждения email.
Код хранится с временем истечения; после успешной верификации запись удаляется.
"""
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class EmailVerificationCode(Base):
    """Код подтверждения email для нового пользователя. Один код на пользователя."""

    __tablename__ = "email_verification_codes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    code: Mapped[str] = mapped_column(String(6), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="email_verification_code")

    def __repr__(self) -> str:
        return f"<EmailVerificationCode user_id={self.user_id} expires_at={self.expires_at}>"
