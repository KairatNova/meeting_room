"""
Роутер авторизации: регистрация с подтверждением email, верификация кода, логин (JWT).
"""
import random
import string
import logging
import re
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
from app.models.password_reset import PasswordResetCode
from app.models.login_verification_code import LoginVerificationCode
from app.models.telegram_pending_link import TelegramPendingLink
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    UserProfileUpdate,
    Token,
    RegisterResponse,
    VerifyEmailRequest,
    VerifyEmailLoginResponse,
    AuthUser,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    LoginRequest,
    LoginRequestResponse,
    LoginVerifyRequest,
)
from app.services.telegram import (
    get_telegram_link,
    send_verification_code as send_telegram_verification_code,
    send_password_reset_code as send_telegram_password_reset_code,
)

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _generate_code(length: int = 6) -> str:
    """Генерация цифрового кода (только цифры)."""
    return "".join(random.choices(string.digits, k=length))


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _normalize_telegram(login: str) -> str:
    """Ник без @, в нижнем регистре."""
    s = login.strip().lstrip("@").lower()
    return s


def _normalize_phone(value: str) -> str:
    """
    Нормализовать номер для сравнения:
    - оставляем цифры и опциональный ведущий +
    - если номер из цифр без +, добавляем +
    - 8XXXXXXXXXX -> +7XXXXXXXXXX (частый RU-ввод)
    """
    raw = value.strip()
    if not raw:
        return ""
    has_plus = raw.startswith("+")
    digits = "".join(ch for ch in raw if ch.isdigit())
    if not digits:
        return ""
    if not has_plus:
        if len(digits) == 11 and digits.startswith("8"):
            digits = "7" + digits[1:]
        return f"+{digits}"
    return f"+{digits}"


def _is_email(login: str) -> bool:
    return bool(EMAIL_RE.match(login.strip()))


def _parse_telegram_identifier(value: str) -> tuple[str | None, str | None]:
    """
    Разобрать Telegram-идентификатор из формы регистрации.
    Возвращает (telegram_username, telegram_phone).
    """
    v = value.strip()
    if not v:
        return None, None
    if v.startswith("@"):
        return _normalize_telegram(v), None
    phone = _normalize_phone(v)
    if phone:
        return None, phone
    return _normalize_telegram(v), None


def _find_user_by_login(db: DbSession, login: str) -> User | None:
    """Найти пользователя по email, Telegram-нику или Telegram-номеру."""
    value = login.strip()
    if not value:
        return None
    if _is_email(value):
        email_norm = _normalize_email(value)
        return db.execute(select(User).where(User.email == email_norm)).scalar_one_or_none()
    phone_norm = _normalize_phone(value)
    if phone_norm:
        user_by_phone = db.execute(select(User).where(User.phone == phone_norm)).scalar_one_or_none()
        if user_by_phone:
            return user_by_phone
    tg_norm = _normalize_telegram(value)
    return db.execute(select(User).where(User.telegram_username == tg_norm)).scalar_one_or_none()


@router.post("/auth/register", response_model=RegisterResponse)
def register(data: UserCreate, db: DbSession) -> RegisterResponse:
    """
    Регистрация: имя, Telegram-ник, почта (только идентификатор), пароль.
    Код подтверждения отправляется только в Telegram — пользователь открывает ссылку и нажимает Start.
    На почту ничего не отправляется.
    """
    settings_obj = get_settings()
    if not settings_obj.telegram_bot_token or not settings_obj.telegram_bot_username:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Регистрация временно недоступна. Обратитесь в поддержку.",
        )

    email_normalized = _normalize_email(data.email)
    telegram_identifier = (data.telegram or data.telegram_username or "").strip()
    telegram_norm, telegram_phone = _parse_telegram_identifier(telegram_identifier)

    stmt = select(User).where(User.email == email_normalized)
    existing = db.execute(stmt).scalar_one_or_none()
    if existing:
        if existing.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже зарегистрирован",
            )
        user = existing
        user.hashed_password = hash_password(data.password)
        user.full_name = data.full_name.strip()
        user.display_name = data.full_name.strip()
        user.telegram_username = telegram_norm
        user.phone = telegram_phone
    else:
        user = User(
            email=email_normalized,
            hashed_password=hash_password(data.password),
            full_name=data.full_name.strip(),
            display_name=data.full_name.strip(),
            telegram_username=telegram_norm,
            phone=telegram_phone,
            is_admin=False,
            is_verified=False,
        )
        db.add(user)
        try:
            db.flush()
        except IntegrityError as e:
            db.rollback()
            err_msg = str(getattr(e, "orig", e)).lower()
            if "unique" in err_msg or "duplicate key" in err_msg or "email" in err_msg:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Пользователь с таким email уже зарегистрирован",
                ) from e
            raise

    code = _generate_code(6)
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.email_verification_code_expire_minutes
    )
    verification = db.execute(
        select(EmailVerificationCode).where(EmailVerificationCode.user_id == user.id)
    ).scalar_one_or_none()
    if verification:
        verification.code = code
        verification.expires_at = expires_at
    else:
        db.add(EmailVerificationCode(user_id=user.id, code=code, expires_at=expires_at))
    db.flush()

    from app.services.telegram import generate_link_token
    link_token = generate_link_token()
    link_expires = datetime.now(timezone.utc) + timedelta(minutes=settings.email_verification_code_expire_minutes)
    existing_link = db.execute(
        select(TelegramPendingLink).where(TelegramPendingLink.user_id == user.id)
    ).scalar_one_or_none()
    if existing_link:
        existing_link.token = link_token
        existing_link.expires_at = link_expires
    else:
        db.add(TelegramPendingLink(user_id=user.id, token=link_token, expires_at=link_expires))
    telegram_link = get_telegram_link(link_token)

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        err_msg = str(getattr(e, "orig", e)).lower()
        if "unique" in err_msg or "duplicate key" in err_msg or "email" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже зарегистрирован",
            ) from e
        raise

    return RegisterResponse(
        message="Код подтверждения придёт в Telegram. Откройте ссылку ниже, нажмите «Start» в боте — бот пришлёт вам код. Введите его на следующем шаге.",
        email=user.email,
        telegram_link=telegram_link,
    )


@router.post("/auth/verify-email", response_model=VerifyEmailLoginResponse)
def verify_email(data: VerifyEmailRequest, db: DbSession) -> VerifyEmailLoginResponse:
    """
    Подтверждение по коду из Telegram. Email — для идентификации аккаунта.
    Если код верный и не истёк — пользователь активируется (is_verified=True).
    """
    email_normalized = _normalize_email(data.email)
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
    if verification.code != data.verification_code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный код подтверждения.",
        )

    user.is_verified = True
    db.delete(verification)
    db.commit()

    access_token = create_access_token(user.id)
    display_name = (user.display_name or user.full_name or "").strip()
    auth_user = AuthUser(id=user.id, email=user.email, name=display_name or user.email)

    return VerifyEmailLoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=auth_user,
    )


@router.post("/auth/login", response_model=Token)
def login(data: UserLogin, db: DbSession) -> Token:
    """
    Вход по email и паролю (без кода). Возвращает JWT.
    Вход разрешён только после подтверждения email (is_verified=True).
    Для входа с кодом в Telegram/email используйте login-request и login-verify.
    """
    email_normalized = _normalize_email(data.email)
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
            detail="Подтвердите аккаунт: откройте ссылку из регистрации в Telegram и введите код.",
        )
    token = create_access_token(user.id)
    return Token(access_token=token, token_type="bearer")


@router.post("/auth/login-request", response_model=LoginRequestResponse)
def login_request(data: LoginRequest, db: DbSession) -> LoginRequestResponse:
    """
    Запрос входа: email или Telegram-ник + пароль. Код отправляется только в Telegram.
    """
    user = _find_user_by_login(db, data.login)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
        )
    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Сначала подтвердите аккаунт: откройте ссылку из регистрации в Telegram и введите код.",
        )
    if not user.telegram_chat_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Код входа отправляется в Telegram. Откройте бота по ссылке из регистрации, нажмите Start, затем попробуйте войти снова.",
        )

    code = _generate_code(6)
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.email_verification_code_expire_minutes
    )
    existing = db.execute(
        select(LoginVerificationCode).where(LoginVerificationCode.user_id == user.id)
    ).scalar_one_or_none()
    if existing:
        existing.code = code
        existing.expires_at = expires_at
    else:
        db.add(LoginVerificationCode(user_id=user.id, code=code, expires_at=expires_at))
    db.commit()

    send_telegram_verification_code(
        user.telegram_chat_id, code, settings.email_verification_code_expire_minutes
    )

    return LoginRequestResponse(
        message="Код отправлен в Telegram. Введите его на следующем шаге.",
        channel="telegram",
    )


@router.post("/auth/login-verify", response_model=VerifyEmailLoginResponse)
def login_verify(data: LoginVerifyRequest, db: DbSession) -> VerifyEmailLoginResponse:
    """Ввод кода подтверждения входа (после login-request). Возвращает JWT и данные пользователя."""
    user = _find_user_by_login(db, data.login)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден.",
        )
    lvc = db.execute(
        select(LoginVerificationCode).where(LoginVerificationCode.user_id == user.id)
    ).scalar_one_or_none()
    if not lvc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Код не найден. Запросите вход заново.",
        )
    if lvc.expires_at < datetime.now(timezone.utc):
        db.delete(lvc)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Срок действия кода истёк. Запросите вход снова.",
        )
    if lvc.code != data.verification_code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный код подтверждения.",
        )
    db.delete(lvc)
    db.commit()

    access_token = create_access_token(user.id)
    display_name = (user.display_name or user.full_name or "").strip()
    auth_user = AuthUser(id=user.id, email=user.email, name=display_name or user.email)
    return VerifyEmailLoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=auth_user,
    )


@router.post("/auth/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: DbSession) -> dict[str, str]:
    """
    Забыли пароль: укажите email или Telegram-ник. Код отправляется только в Telegram.
    """
    if not data.email and not data.telegram:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Укажите email или Telegram-ник",
        )
    login = (data.email or data.telegram or "").strip()
    user = _find_user_by_login(db, login)
    if not user:
        return {"message": "Если такой аккаунт зарегистрирован, код для сброса пароля отправлен в Telegram."}

    code = _generate_code(6)
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.email_verification_code_expire_minutes
    )
    existing = db.execute(
        select(PasswordResetCode).where(PasswordResetCode.user_id == user.id)
    ).scalar_one_or_none()
    if existing:
        existing.code = code
        existing.expires_at = expires_at
        reset = existing
    else:
        reset = PasswordResetCode(user_id=user.id, code=code, expires_at=expires_at)
        db.add(reset)
    db.commit()

    if user.telegram_chat_id:
        send_telegram_password_reset_code(
            user.telegram_chat_id, code, settings.email_verification_code_expire_minutes
        )

    return {"message": "Если такой аккаунт зарегистрирован, код для сброса пароля отправлен в Telegram."}


@router.post("/auth/reset-password")
def reset_password(data: ResetPasswordRequest, db: DbSession) -> dict[str, str]:
    """
    Сброс пароля по коду из Telegram. login — email или Telegram-ник.
    """
    user = _find_user_by_login(db, data.login)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден.",
        )

    reset = db.execute(
        select(PasswordResetCode).where(PasswordResetCode.user_id == user.id)
    ).scalar_one_or_none()
    if not reset:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Код для сброса пароля не найден или уже использован.",
        )
    if reset.expires_at < datetime.now(timezone.utc):
        db.delete(reset)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Срок действия кода для сброса пароля истёк.",
        )
    if reset.code != data.reset_code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный код для сброса пароля.",
        )

    user.hashed_password = hash_password(data.new_password)
    db.delete(reset)
    db.commit()

    return {"message": "Пароль успешно изменён. Теперь вы можете войти в систему."}


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
