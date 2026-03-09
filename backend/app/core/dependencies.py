"""
FastAPI dependencies: текущий пользователь, админ, сессия БД.
Используются в роутерах через Depends().
"""
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.core.security import decode_access_token

security = HTTPBearer(auto_error=False)


def _get_current_user_optional(
    db: Annotated[Session, Depends(get_db)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> User | None:
    """
    Опциональный текущий пользователь по JWT.
    Если токена нет или он невалиден — возвращаем None.
    """
    if not credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        return None
    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError):
        return None
    user = db.get(User, user_id)
    return user


def get_current_user(
    user: Annotated[User | None, Depends(_get_current_user_optional)],
) -> User:
    """Требуем авторизацию: если пользователя нет — 401."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_admin(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Требуем роль админа. Иначе 403."""
    if not getattr(user, "is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


# Типы для аннотаций в роутерах (удобно переиспользовать)
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(require_admin)]
OptionalUser = Annotated[User | None, Depends(_get_current_user_optional)]
