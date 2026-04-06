"""Схемы для эндпоинтов админ-панели (не путать с модулем api/admin.py)."""

from pydantic import BaseModel, EmailStr, Field


class PromoteAdminRequest(BaseModel):
    """Назначить существующего пользователя администратором по email."""

    email: EmailStr = Field(..., description="Email зарегистрированного пользователя")


class AdminUserBrief(BaseModel):
    id: int
    email: str
    full_name: str
    is_admin: bool

    model_config = {"from_attributes": True}


class PromoteAdminResponse(BaseModel):
    message: str
    user: AdminUserBrief


class DemoteAdminResponse(BaseModel):
    message: str
