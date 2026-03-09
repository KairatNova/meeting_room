"""
Роутер комнат: публичный список и детали, CRUD для админа.
"""
from sqlalchemy import select

from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.core.dependencies import DbSession, AdminUser
from app.models.room import Room
from app.schemas.room import RoomCreate, RoomUpdate, RoomResponse

router = APIRouter()


@router.get("", response_model=list[RoomResponse])
def list_rooms(
    db: DbSession,
    capacity_min: int | None = Query(None, ge=1, description="Минимальная вместимость"),
    search: str | None = Query(None, description="Поиск по названию/описанию"),
) -> list[RoomResponse]:
    """
    Список комнат с опциональными фильтрами.
    Доступно без авторизации.
    """
    stmt = select(Room).order_by(Room.name)
    if capacity_min is not None:
        stmt = stmt.where(Room.capacity >= capacity_min)
    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where((Room.name.ilike(term)) | (Room.description.ilike(term)))
    result = db.execute(stmt)
    rooms = result.scalars().all()
    return [RoomResponse.model_validate(r) for r in rooms]


@router.get("/{room_id}", response_model=RoomResponse)
def get_room(room_id: int, db: DbSession) -> RoomResponse:
    """Детальная информация о комнате."""
    room = db.get(Room, room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Комната не найдена")
    return RoomResponse.model_validate(room)


# --- Админ: создание, обновление, удаление ---

@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(data: RoomCreate, db: DbSession, admin: AdminUser) -> RoomResponse:
    """Создать комнату (только админ)."""
    room = Room(
        name=data.name.strip(),
        description=data.description.strip() if data.description else None,
        capacity=data.capacity,
        amenities=data.amenities.strip() if data.amenities else None,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return RoomResponse.model_validate(room)


@router.patch("/{room_id}", response_model=RoomResponse)
def update_room(
    room_id: int,
    data: RoomUpdate,
    db: DbSession,
    admin: AdminUser,
) -> RoomResponse:
    """Обновить комнату (только админ)."""
    room = db.get(Room, room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Комната не найдена")
    if data.name is not None:
        room.name = data.name.strip()
    if data.description is not None:
        room.description = data.description.strip() if data.description else None
    if data.capacity is not None:
        room.capacity = data.capacity
    if data.amenities is not None:
        room.amenities = data.amenities.strip() if data.amenities else None
    db.add(room)
    db.commit()
    db.refresh(room)
    return RoomResponse.model_validate(room)


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(room_id: int, db: DbSession, admin: AdminUser) -> None:
    """Удалить комнату (только админ)."""
    room = db.get(Room, room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Комната не найдена")
    db.delete(room)
    db.commit()
