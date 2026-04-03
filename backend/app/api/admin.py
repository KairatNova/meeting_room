"""
Роутер админ-панели: доп. эндпоинты только для админа.
Комнаты CRUD уже в rooms.py с зависимостью AdminUser.
"""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.dependencies import AdminUser, DbSession
from app.models.user import User
from app.schemas.admin_api import AdminUserBrief, PromoteAdminRequest, PromoteAdminResponse

router = APIRouter()


def _normalize_email(email: str) -> str:
    return email.strip().lower()


@router.get("/admins", response_model=list[AdminUserBrief])
def list_admins(db: DbSession, admin: AdminUser) -> list[User]:
    """Список всех пользователей с ролью администратора."""
    return list(
        db.execute(select(User).where(User.is_admin.is_(True)).order_by(User.id)).scalars().all()
    )


@router.post("/promote-user", response_model=PromoteAdminResponse)
def promote_user(data: PromoteAdminRequest, db: DbSession, admin: AdminUser) -> PromoteAdminResponse:
    """
    Назначить пользователя администратором по email.
    Пользователь должен уже существовать (после регистрации).
    """
    email_norm = _normalize_email(str(data.email))
    user = db.execute(select(User).where(User.email == email_norm)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь с таким email не найден. Сначала пусть зарегистрируется на сайте.",
        )
    if user.is_admin:
        return PromoteAdminResponse(
            message="Пользователь уже является администратором.",
            user=AdminUserBrief.model_validate(user),
        )
    user.is_admin = True
    user.is_verified = True
    db.add(user)
    db.commit()
    db.refresh(user)
    return PromoteAdminResponse(
        message="Пользователь назначен администратором.",
        user=AdminUserBrief.model_validate(user),
    )


@router.get("/me")
def admin_info(admin: AdminUser) -> dict:
    """
    Информация о текущем админе (для проверки доступа на фронте).
    Доступно только пользователям с is_admin=True.
    """
    return {
        "id": admin.id,
        "email": admin.email,
        "full_name": admin.full_name,
        "is_admin": True,
    }
