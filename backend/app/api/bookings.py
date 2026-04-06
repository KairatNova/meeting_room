"""
Роутер бронирований: создание с проверкой конфликтов, мои брони, отмена.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.dependencies import DbSession, CurrentUser
from app.models.booking import Booking
from app.models.room import Room
from app.schemas.booking import BookingCreate, BookingResponse, booking_to_response
from app.services.booking_conflict import has_booking_conflict

router = APIRouter()
MAX_BOOKING_DURATION_HOURS = 6
MIN_BOOKING_DURATION_MINUTES = 30
CONFLICT_BUFFER_MINUTES = 15
CANCEL_DEADLINE_MINUTES = 30


def _ensure_utc(dt: datetime) -> datetime:
    """Привести datetime к timezone-aware UTC при необходимости."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


@router.get("", response_model=list[BookingResponse])
def list_bookings(
    db: DbSession,
    room_id: int | None = Query(None, ge=1, description="Фильтр по комнате (для календаря)"),
    from_time: datetime | None = Query(None, description="Начало периода"),
    to_time: datetime | None = Query(None, description="Конец периода"),
) -> list[BookingResponse]:
    """
    Список бронирований. С room_id — брони одной комнаты (для календаря).
    Параметры from_time / to_time задают период (пересечение с ним).
    """
    stmt = select(Booking).options(selectinload(Booking.room)).order_by(Booking.start_time)
    if room_id is not None:
        stmt = stmt.where(Booking.room_id == room_id)
    if from_time is not None:
        from_time = _ensure_utc(from_time)
        stmt = stmt.where(Booking.end_time > from_time)
    if to_time is not None:
        to_time = _ensure_utc(to_time)
        stmt = stmt.where(Booking.start_time < to_time)
    result = db.execute(stmt)
    bookings = result.scalars().all()
    return [booking_to_response(b) for b in bookings]


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(data: BookingCreate, db: DbSession, user: CurrentUser) -> BookingResponse:
    """
    Создать бронирование.
    Проверка пересечения времени (конфликты) — при конфликте 409.
    """
    start = _ensure_utc(data.start_time)
    end = _ensure_utc(data.end_time)
    if end <= start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Время окончания должно быть позже времени начала",
        )
    duration_seconds = (end - start).total_seconds()
    if duration_seconds < MIN_BOOKING_DURATION_MINUTES * 60:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Минимальная длительность бронирования — {MIN_BOOKING_DURATION_MINUTES} минут",
        )
    if duration_seconds > MAX_BOOKING_DURATION_HOURS * 3600:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Максимальная длительность бронирования — {MAX_BOOKING_DURATION_HOURS} часов",
        )
    if start < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя создать бронирование в прошлом",
        )
    room = db.get(Room, data.room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Комната не найдена")
    if has_booking_conflict(
        db,
        data.room_id,
        start,
        end,
        exclude_booking_id=None,
        buffer_minutes=CONFLICT_BUFFER_MINUTES,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Выбранное время пересекается с существующим бронированием "
                f"(учитывается буфер {CONFLICT_BUFFER_MINUTES} минут)"
            ),
        )
    booking = Booking(
        user_id=user.id,
        room_id=data.room_id,
        start_time=start,
        end_time=end,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking_to_response(booking)


@router.get("/me", response_model=list[BookingResponse])
def my_bookings(
    db: DbSession,
    user: CurrentUser,
    from_time: datetime | None = Query(None, description="Начало периода"),
    to_time: datetime | None = Query(None, description="Конец периода"),
) -> list[BookingResponse]:
    """Список бронирований текущего пользователя (будущие или за период)."""
    stmt = (
        select(Booking)
        .options(selectinload(Booking.room))
        .where(Booking.user_id == user.id)
        .order_by(Booking.start_time)
    )
    if from_time is not None:
        from_time = _ensure_utc(from_time)
        stmt = stmt.where(Booking.end_time > from_time)
    if to_time is not None:
        to_time = _ensure_utc(to_time)
        stmt = stmt.where(Booking.start_time < to_time)
    result = db.execute(stmt)
    bookings = result.scalars().all()
    return [booking_to_response(b) for b in bookings]


@router.get("/{booking_id}", response_model=BookingResponse)
def get_booking(booking_id: int, db: DbSession, user: CurrentUser) -> BookingResponse:
    """Детали одной брони. Доступно владельцу брони или администратору."""
    booking = db.execute(
        select(Booking).options(selectinload(Booking.room)).where(Booking.id == booking_id)
    ).scalar_one_or_none()
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Бронирование не найдено")
    if booking.user_id != user.id and not bool(getattr(user, "is_admin", False)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этому бронированию",
        )
    return booking_to_response(booking)


@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_booking(booking_id: int, db: DbSession, user: CurrentUser) -> None:
    """Отменить своё бронирование. Только владелец, только будущие брони."""
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Бронирование не найдено")
    if booking.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Можно отменить только своё бронирование",
        )
    now = datetime.now(timezone.utc)
    booking_end = _ensure_utc(booking.end_time)
    booking_start = _ensure_utc(booking.start_time)
    if booking_end < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя отменить прошедшее бронирование",
        )
    if (booking_start - now).total_seconds() < CANCEL_DEADLINE_MINUTES * 60:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Отмена недоступна менее чем за "
                f"{CANCEL_DEADLINE_MINUTES} минут до начала бронирования"
            ),
        )
    db.delete(booking)
    db.commit()
