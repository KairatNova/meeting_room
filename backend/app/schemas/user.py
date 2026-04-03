"""
Схемы для пользователя: регистрация, ответ, токен.
"""
from datetime import date

from pydantic import BaseModel, EmailStr, Field, model_validator


class UserCreate(BaseModel):
    """Тело запроса регистрации. Код подтверждения отправляется только в Telegram."""

    full_name: str = Field(..., min_length=1, max_length=255, description="Имя")
    telegram: str | None = Field(
        default=None,
        min_length=1,
        max_length=64,
        description="Telegram-идентификатор: @username или номер телефона",
    )
    telegram_username: str | None = Field(
        default=None,
        min_length=1,
        max_length=64,
        description="Устаревшее поле для совместимости: Telegram username (без @)",
    )
    email: EmailStr = Field(..., description="Почта только для идентификации аккаунта, письма не отправляются")
    password: str = Field(..., min_length=8)

    @model_validator(mode="after")
    def _validate_telegram_identifier(self) -> "UserCreate":
        # Backward compatibility: if old field is sent, use it.
        if not self.telegram and self.telegram_username:
            self.telegram = self.telegram_username
        if not self.telegram:
            raise ValueError("Укажите Telegram: @username или номер телефона")
        return self


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
    """Тело запроса входа (email + пароль, без кода)."""

    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    """Запрос на вход: email или Telegram-ник + пароль. Код придёт в Telegram или на email."""

    login: str = Field(..., min_length=1, description="Email или @username Telegram")
    password: str = Field(..., min_length=1)


class LoginRequestResponse(BaseModel):
    """Ответ после запроса входа. Код отправляется только в Telegram."""

    message: str
    channel: str = Field(default="telegram", description="telegram")


class LoginVerifyRequest(BaseModel):
    """Ввод кода подтверждения входа (после login-request)."""

    login: str = Field(..., min_length=1)
    verification_code: str = Field(
        ...,
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
        description="6-значный код из Telegram или письма",
    )


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
    """Ответ после успешной отправки формы регистрации."""

    message: str
    email: str
    telegram_link: str | None = Field(
        default=None,
        description="Ссылка t.me/bot?start=TOKEN — откройте в Telegram для получения кода",
    )


class VerifyEmailRequest(BaseModel):
    """Тело запроса подтверждения (страница ввода кода из Telegram)."""

    email: EmailStr
    verification_code: str = Field(
        ...,
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
        description="6-значный код из Telegram",
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
    """Запрос на сброс пароля: email или Telegram-ник."""

    email: str | None = Field(default=None, description="Email для поиска пользователя")
    telegram: str | None = Field(default=None, description="Telegram @username или номер для поиска")


class ResetPasswordRequest(BaseModel):
    """Сброс пароля по коду из Telegram."""

    login: str = Field(..., min_length=1, description="Email или Telegram-ник")
    reset_code: str = Field(
        ...,
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
        description="6-значный код для сброса пароля",
    )
    new_password: str = Field(..., min_length=8)

