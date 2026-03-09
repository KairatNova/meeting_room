"""
Роутер админ-панели: доп. эндпоинты только для админа.
Комнаты CRUD уже в rooms.py с зависимостью AdminUser.
"""
from fastapi import APIRouter, Depends

from app.core.dependencies import AdminUser
from app.models.user import User

router = APIRouter()


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
