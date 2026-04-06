"""
Роутер админ-панели: доп. эндпоинты только для админа.
Комнаты CRUD уже в rooms.py с зависимостью AdminUser.
"""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.core.dependencies import AdminUser, DbSession
from app.models.user import User
from app.schemas.admin_api import AdminUserBrief, DemoteAdminResponse, PromoteAdminRequest, PromoteAdminResponse

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


@router.delete("/admins/{user_id}", response_model=DemoteAdminResponse)
def demote_admin(user_id: int, db: DbSession, admin: AdminUser) -> DemoteAdminResponse:
    """Снять права администратора с другого пользователя (не с себя; в системе остаётся ≥1 админ)."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя снять права администратора с собственной учётной записи.",
        )
    target = db.get(User, user_id)
    if target is None or not target.is_admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден или не является администратором.",
        )
    admin_count = (
        db.execute(select(func.count()).select_from(User).where(User.is_admin.is_(True))).scalar() or 0
    )
    if admin_count < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="В системе должен остаться хотя бы один администратор.",
        )
    target.is_admin = False
    db.add(target)
    db.commit()
    db.refresh(target)
    return DemoteAdminResponse(message="Права администратора сняты.")


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
