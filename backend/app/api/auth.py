"""
Роутер авторизации: регистрация с подтверждением email, верификация кода, логин (JWT).
"""
import random
import string
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError

from app.config import get_settings
from app.core.dependencies import DbSession, CurrentUser
from app.core.security import verify_password, hash_password, create_access_token
from app.models.user import User
from app.models.email_verification import EmailVerificationCode
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    UserProfileUpdate,
    Token,
    RegisterResponse,
    VerifyEmailRequest,
    VerifyEmailResponse,
)
from app.services.email import send_verification_email

router = APIRouter()
settings = get_settings()


def _generate_code(length: int = 6) -> str:
    """Генерация цифрового кода (только цифры)."""
    return "".join(random.choices(string.digits, k=length))


@router.post("/auth/register", response_model=RegisterResponse)
def register(data: UserCreate, db: DbSession) -> RegisterResponse:
    """
    Регистрация: создаётся пользователь (is_verified=False), генерируется 6-значный код,
    сохраняется в БД с временем жизни (по умолчанию 10 мин), код отправляется на email.
    Пароль хранится в виде хэша. Email нормализуется (lowercase) для поиска и хранения.
    """
    email_normalized = data.email.strip().lower()
    stmt = select(User).where(User.email == email_normalized)
    existing = db.execute(stmt).scalar_one_or_none()
    if existing:
        if existing.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже зарегистрирован",
            )
        # Повторная регистрация с тем же email: обновляем пароль и перезаписываем код
        user = existing
        user.hashed_password = hash_password(data.password)
        user.full_name = data.full_name.strip()
        user.display_name = data.full_name.strip()
        # Удаляем старый код, если есть
        stmt_code = select(EmailVerificationCode).where(EmailVerificationCode.user_id == user.id)
        old_code = db.execute(stmt_code).scalar_one_or_none()
        if old_code:
            db.delete(old_code)
    else:
        user = User(
            email=email_normalized,
            hashed_password=hash_password(data.password),
            full_name=data.full_name.strip(),
            display_name=data.full_name.strip(),
            is_admin=False,
            is_verified=False,
        )
        db.add(user)
        db.flush()

    code = _generate_code(6)
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.email_verification_code_expire_minutes
    )
    verification = EmailVerificationCode(
        user_id=user.id,
        code=code,
        expires_at=expires_at,
    )
    db.add(verification)
    db.flush()

    try:
        send_verification_email(user.email, code)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Не удалось отправить письмо. Проверьте настройки SMTP или попробуйте позже.",
        ) from e

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        if "ix_users_email" in str(e.orig) or "unique" in str(e.orig).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже зарегистрирован",
            ) from e
        raise

    return RegisterResponse(
        message="На вашу почту отправлен код подтверждения. Введите его для активации аккаунта.",
        email=user.email,
    )


@router.post("/auth/verify-email", response_model=VerifyEmailResponse)
def verify_email(data: VerifyEmailRequest, db: DbSession) -> VerifyEmailResponse:
    """
    Подтверждение email: проверка кода. Если код верный и не истёк — пользователь
    активируется (is_verified=True), код удаляется из БД. После этого возможен вход.
    """
    email_normalized = data.email.strip().lower()
    stmt = (
        select(User)
        .where(User.email == email_normalized)
        .options(selectinload(User.email_verification_code))
    )
    user = db.execute(stmt).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь с таким email не найден. Сначала зарегистрируйтесь.",
        )
    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email уже подтверждён. Вы можете войти в систему.",
        )

    verification = user.email_verification_code
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Код не найден. Запросите регистрацию заново.",
        )
    if verification.expires_at < datetime.now(timezone.utc):
        db.delete(verification)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Срок действия кода истёк. Зарегистрируйтесь снова, чтобы получить новый код.",
        )
    if verification.code != data.code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный код подтверждения.",
        )

    user.is_verified = True
    db.delete(verification)
    db.commit()
    return VerifyEmailResponse(message="Email подтверждён. Теперь вы можете войти в систему.")


@router.post("/auth/login", response_model=Token)
def login(data: UserLogin, db: DbSession) -> Token:
    """
    Вход по email и паролю. Возвращает JWT access_token.
    Вход разрешён только после подтверждения email (is_verified=True).
    """
    email_normalized = data.email.strip().lower()
    stmt = select(User).where(User.email == email_normalized)
    user = db.execute(stmt).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
        )
    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Подтвердите email. Проверьте почту и введите код подтверждения.",
        )
    token = create_access_token(user.id)
    return Token(access_token=token, token_type="bearer")


@router.get("/auth/me", response_model=UserResponse)
def get_current_user_info(user: CurrentUser) -> UserResponse:
    """Текущий пользователь по JWT. Для фронта: проверка авторизации, профиля и роли."""
    return UserResponse.model_validate(user)


@router.patch("/users/me", response_model=UserResponse)
def update_profile(
    data: UserProfileUpdate,
    db: DbSession,
    user: CurrentUser,
) -> UserResponse:
    """
    Обновление профиля текущего пользователя:
    имя, отображаемое имя, телефон, дата рождения, пол, гражданство.
    """
    if data.full_name is not None:
        user.full_name = data.full_name.strip()
    if data.display_name is not None:
        user.display_name = data.display_name.strip()
    if data.phone is not None:
        user.phone = data.phone.strip()
    if data.birth_date is not None:
        user.birth_date = data.birth_date
    if data.gender is not None:
        user.gender = data.gender
    if data.citizenship is not None:
        user.citizenship = data.citizenship

    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)
