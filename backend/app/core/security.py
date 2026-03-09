"""
JWT и хэширование паролей.
Типизация для payload и паролей.
"""
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.config import get_settings

settings = get_settings()

# bcrypt принимает только первые 72 байта
BCRYPT_MAX_PASSWORD_BYTES = 72


# --- Пароли ---

def hash_password(password: str) -> str:
    """Хэширование пароля для хранения в БД."""
    pw_bytes = password.encode("utf-8")
    if len(pw_bytes) > BCRYPT_MAX_PASSWORD_BYTES:
        pw_bytes = pw_bytes[:BCRYPT_MAX_PASSWORD_BYTES]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Проверка пароля против хэша."""
    pw_bytes = plain.encode("utf-8")
    if len(pw_bytes) > BCRYPT_MAX_PASSWORD_BYTES:
        pw_bytes = pw_bytes[:BCRYPT_MAX_PASSWORD_BYTES]
    return bcrypt.checkpw(pw_bytes, hashed.encode("utf-8"))


# --- JWT ---

def create_access_token(subject: str | int, extra_claims: dict[str, Any] | None = None) -> str:
    """
    Создать access token.
    subject — обычно user.id (или email), кладётся в sub.
    extra_claims — доп. поля (например is_admin).
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": now,
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Декодировать и проверить token. При ошибке возвращаем None."""
    try:
        return jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
    except JWTError:
        return None
