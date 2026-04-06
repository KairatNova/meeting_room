"""
Роутер комнат: публичный список и детали, CRUD для админа.
"""
import uuid
from pathlib import Path
from typing import Annotated

from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from fastapi import APIRouter, Depends, File, HTTPException, status, Query, UploadFile

from app.config import get_settings
from app.core.dependencies import DbSession, AdminUser, CurrentUser
from app.models.room import Room
from app.models.room_photo import RoomPhoto
from app.models.room_review import RoomReview
from app.schemas.room import RoomCreate, RoomUpdate, RoomResponse, room_to_response
from app.schemas.review import ReviewCreate, ReviewResponse

router = APIRouter()

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.get("", response_model=list[RoomResponse])
def list_rooms(
    db: DbSession,
    capacity_min: int | None = Query(None, ge=1, description="Минимальная вместимость"),
    search: str | None = Query(None, description="Поиск по названию/описанию"),
    amenities: str | None = Query(None, description="Фильтр по удобствам"),
    region: str | None = Query(None, description="Фильтр по области"),
    city: str | None = Query(None, description="Фильтр по городу"),
    district: str | None = Query(None, description="Фильтр по району"),
    address: str | None = Query(None, description="Фильтр по адресу"),
    sort_by: str | None = Query(
        "name_asc",
        description="Сортировка: name_asc|name_desc|capacity_asc|capacity_desc|newest",
    ),
) -> list[RoomResponse]:
    """
    Список комнат с опциональными фильтрами.
    Доступно без авторизации.
    """
    stmt = select(Room)
    if capacity_min is not None:
        stmt = stmt.where(Room.capacity >= capacity_min)
    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where((Room.name.ilike(term)) | (Room.description.ilike(term)))
    if amenities and amenities.strip():
        amenities_term = f"%{amenities.strip()}%"
        stmt = stmt.where(Room.amenities.ilike(amenities_term))
    if region and region.strip():
        stmt = stmt.where(Room.region.ilike(f"%{region.strip()}%"))
    if city and city.strip():
        stmt = stmt.where(Room.city.ilike(f"%{city.strip()}%"))
    if district and district.strip():
        stmt = stmt.where(Room.district.ilike(f"%{district.strip()}%"))
    if address and address.strip():
        stmt = stmt.where(Room.address.ilike(f"%{address.strip()}%"))

    if sort_by == "name_desc":
        stmt = stmt.order_by(desc(Room.name))
    elif sort_by == "capacity_asc":
        stmt = stmt.order_by(Room.capacity.asc(), Room.name.asc())
    elif sort_by == "capacity_desc":
        stmt = stmt.order_by(Room.capacity.desc(), Room.name.asc())
    elif sort_by == "newest":
        stmt = stmt.order_by(Room.created_at.desc(), Room.name.asc())
    else:
        stmt = stmt.order_by(Room.name.asc())

    result = db.execute(stmt)
    rooms = result.scalars().all()
    return [room_to_response(r) for r in rooms]


@router.get("/{room_id}", response_model=RoomResponse)
def get_room(room_id: int, db: DbSession) -> RoomResponse:
    """Детальная информация о комнате."""
    room = db.get(Room, room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Комната не найдена")
    return room_to_response(room)


# --- Админ: создание, обновление, удаление ---

@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(data: RoomCreate, db: DbSession, admin: AdminUser) -> RoomResponse:
    """Создать комнату (только админ)."""
    room = Room(
        name=data.name.strip(),
        description=data.description.strip() if data.description else None,
        capacity=data.capacity,
        amenities=data.amenities.strip() if data.amenities else None,
        region=data.region.strip() if data.region else None,
        city=data.city.strip() if data.city else None,
        district=data.district.strip() if data.district else None,
        address=data.address.strip() if data.address else None,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return room_to_response(room)


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
    if data.region is not None:
        room.region = data.region.strip() if data.region else None
    if data.city is not None:
        room.city = data.city.strip() if data.city else None
    if data.district is not None:
        room.district = data.district.strip() if data.district else None
    if data.address is not None:
        room.address = data.address.strip() if data.address else None
    db.add(room)
    db.commit()
    db.refresh(room)
    return room_to_response(room)


@router.post("/{room_id}/photos", response_model=RoomResponse)
def upload_room_photos(
    room_id: int,
    db: DbSession,
    admin: AdminUser,
    files: Annotated[list[UploadFile], File(description="Файлы изображений")],
) -> RoomResponse:
    """Добавить одну или несколько фотографий к комнате (только админ)."""
    room = db.get(Room, room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Комната не найдена")
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Выберите хотя бы один файл изображения.",
        )

    settings = get_settings()
    upload_root = Path(__file__).resolve().parent.parent.parent / settings.upload_dir
    room_photos_dir = upload_root / "rooms" / str(room_id)
    room_photos_dir.mkdir(parents=True, exist_ok=True)

    count_added = 0
    for f in files:
        if not f.filename:
            continue
        ext = Path(f.filename).suffix.lower()
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Недопустимый формат файла. Разрешены: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}",
            )
        content = f.file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Размер файла не должен превышать 5 МБ",
            )
        name = f"{uuid.uuid4().hex}{ext}"
        rel_path = f"rooms/{room_id}/{name}"
        file_path = upload_root / rel_path
        file_path.write_bytes(content)
        photo = RoomPhoto(room_id=room_id, path=rel_path)
        db.add(photo)
        count_added += 1

    if count_added == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Не удалось сохранить изображения: проверьте формат файлов и имена.",
        )

    db.commit()
    # После commit коллекция room.photos у старого экземпляра может быть устаревшей — перечитываем с фото.
    room_loaded = db.execute(
        select(Room).options(selectinload(Room.photos)).where(Room.id == room_id)
    ).scalar_one()
    return room_to_response(room_loaded)


@router.delete("/{room_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room_photo(
    room_id: int,
    photo_id: int,
    db: DbSession,
    admin: AdminUser,
) -> None:
    """Удалить фотографию комнаты (только админ)."""
    room = db.get(Room, room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Комната не найдена")
    photo = next((p for p in room.photos if p.id == photo_id), None)
    if photo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Фотография не найдена")

    settings = get_settings()
    upload_root = Path(__file__).resolve().parent.parent.parent / settings.upload_dir
    file_path = upload_root / photo.path
    if file_path.exists():
        try:
            file_path.unlink()
        except OSError:
            pass
    db.delete(photo)
    db.commit()


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(room_id: int, db: DbSession, admin: AdminUser) -> None:
    """Удалить комнату (только админ)."""
    room = db.get(Room, room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Комната не найдена")
    db.delete(room)
    db.commit()


@router.get("/{room_id}/reviews", response_model=list[ReviewResponse])
def list_room_reviews(room_id: int, db: DbSession) -> list[ReviewResponse]:
    """Список отзывов комнаты (публичный)."""
    room = db.get(Room, room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Комната не найдена")
    stmt = (
        select(RoomReview)
        .options(selectinload(RoomReview.user))
        .where(RoomReview.room_id == room_id)
        .order_by(RoomReview.created_at.desc())
    )
    reviews = db.execute(stmt).scalars().all()
    result: list[ReviewResponse] = []
    for r in reviews:
        author = (r.user.display_name or r.user.full_name or r.user.email).strip()
        result.append(
            ReviewResponse(
                id=r.id,
                room_id=r.room_id,
                user_id=r.user_id,
                author_name=author,
                rating=r.rating,
                comment=r.comment,
                created_at=r.created_at,
            )
        )
    return result


@router.post("/{room_id}/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_room_review(
    room_id: int,
    data: ReviewCreate,
    db: DbSession,
    user: CurrentUser,
) -> ReviewResponse:
    """Добавить отзыв к комнате (только авторизованный пользователь)."""
    room = db.get(Room, room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Комната не найдена")
    review = RoomReview(
        room_id=room_id,
        user_id=user.id,
        rating=data.rating,
        comment=data.comment.strip(),
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    author = (user.display_name or user.full_name or user.email).strip()
    return ReviewResponse(
        id=review.id,
        room_id=review.room_id,
        user_id=review.user_id,
        author_name=author,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
    )
