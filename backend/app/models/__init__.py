"""
Модели SQLAlchemy 2.0.
Импорт здесь нужен для Alembic (env.py) и для удобного доступа к моделям.
"""
from app.models.user import User
from app.models.room import Room
from app.models.booking import Booking
from app.models.email_verification import EmailVerificationCode

__all__ = ["User", "Room", "Booking", "EmailVerificationCode"]
