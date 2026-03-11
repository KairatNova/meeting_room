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
    verification_code: str = Field(
        ...,
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
        description="6-значный код подтверждения из письма",
    )


class AuthUser(BaseModel):
    """Короткая информация о пользователе в ответах авторизации."""

    id: int
    email: str
    name: str


class VerifyEmailLoginResponse(BaseModel):
    """
    Ответ после успешного подтверждения email:
    сразу возвращаем access_token и краткую информацию о пользователе.
    """

    access_token: str
    token_type: str = "bearer"
    user: AuthUser


# --- Сброс пароля ---


class ForgotPasswordRequest(BaseModel):
    """Запрос на сброс пароля (забыли пароль)."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Сброс пароля по коду из письма."""

    email: EmailStr
    reset_code: str = Field(
        ...,
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
        description="6-значный код для сброса пароля",
    )
    new_password: str = Field(..., min_length=8)

