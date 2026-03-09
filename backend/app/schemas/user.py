"""
Схемы для пользователя: регистрация, ответ, токен.
"""
from datetime import date

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Тело запроса регистрации."""

    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=1, max_length=255)


class UserResponse(BaseModel):
    """Пользователь в ответах API (без пароля)."""

    id: int
    email: str
    full_name: str
    display_name: str | None = None
    phone: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    citizenship: str | None = None
    is_admin: bool
    is_verified: bool = False

    model_config = {"from_attributes": True}


class UserLogin(BaseModel):
    """Тело запроса входа."""

    email: EmailStr
    password: str


class UserProfileUpdate(BaseModel):
    """Обновление профиля текущего пользователя."""

    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    display_name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    birth_date: date | None = None
    gender: str | None = Field(default=None, max_length=16)
    citizenship: str | None = Field(default=None, max_length=64)


class Token(BaseModel):
    """Ответ с JWT и типом токена."""

    access_token: str
    token_type: str = "bearer"


# --- Подтверждение email ---


class RegisterResponse(BaseModel):
    """Ответ после успешной отправки формы регистрации (код отправлен на email)."""

    message: str = "На вашу почту отправлен код подтверждения. Введите его для активации аккаунта."
    email: str


class VerifyEmailRequest(BaseModel):
    """Тело запроса подтверждения email (страница ввода кода)."""

    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class VerifyEmailResponse(BaseModel):
    """Ответ после успешного подтверждения email."""

    message: str = "Email подтверждён. Теперь вы можете войти в систему."
