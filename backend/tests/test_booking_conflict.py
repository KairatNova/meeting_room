from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import Booking, Room, User
from app.services.booking_conflict import has_booking_conflict


def _utc_dt(hour: int, minute: int = 0) -> datetime:
    return datetime(2026, 3, 10, hour, minute, tzinfo=timezone.utc)


def _make_session():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()


def _seed_user_and_room(db):
    user = User(
        email="test@example.com",
        hashed_password="hashed",
        full_name="Test User",
        display_name="Test",
        is_admin=False,
        is_verified=True,
    )
    room = Room(name="Room A", description="Meeting room", capacity=6, amenities="Projector")
    db.add_all([user, room])
    db.commit()
    db.refresh(user)
    db.refresh(room)
    return user, room


def _create_booking(db, user_id: int, room_id: int, start: datetime, end: datetime) -> Booking:
    booking = Booking(user_id=user_id, room_id=room_id, start_time=start, end_time=end)
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


def test_has_booking_conflict_returns_false_when_room_has_no_bookings():
    db = _make_session()
    _, room = _seed_user_and_room(db)

    result = has_booking_conflict(db, room.id, _utc_dt(9), _utc_dt(10))

    assert result is False
    db.close()


def test_has_booking_conflict_detects_overlap_inside_existing_booking():
    db = _make_session()
    user, room = _seed_user_and_room(db)
    _create_booking(db, user.id, room.id, _utc_dt(10), _utc_dt(12))

    result = has_booking_conflict(db, room.id, _utc_dt(11), _utc_dt(11, 30))

    assert result is True
    db.close()


def test_has_booking_conflict_detects_overlap_on_left_and_right_edges():
    db = _make_session()
    user, room = _seed_user_and_room(db)
    _create_booking(db, user.id, room.id, _utc_dt(10), _utc_dt(12))

    left_overlap = has_booking_conflict(db, room.id, _utc_dt(9, 30), _utc_dt(10, 30))
    right_overlap = has_booking_conflict(db, room.id, _utc_dt(11, 30), _utc_dt(12, 30))

    assert left_overlap is True
    assert right_overlap is True
    db.close()


def test_has_booking_conflict_returns_false_when_times_only_touch_boundaries():
    db = _make_session()
    user, room = _seed_user_and_room(db)
    _create_booking(db, user.id, room.id, _utc_dt(10), _utc_dt(12))

    before = has_booking_conflict(db, room.id, _utc_dt(8), _utc_dt(10))
    after = has_booking_conflict(db, room.id, _utc_dt(12), _utc_dt(13))

    assert before is False
    assert after is False
    db.close()


def test_has_booking_conflict_returns_false_for_other_room():
    db = _make_session()
    user, room_a = _seed_user_and_room(db)
    room_b = Room(name="Room B", description="Another room", capacity=4, amenities="TV")
    db.add(room_b)
    db.commit()
    db.refresh(room_b)
    _create_booking(db, user.id, room_a.id, _utc_dt(10), _utc_dt(12))

    result = has_booking_conflict(db, room_b.id, _utc_dt(10, 30), _utc_dt(11, 30))

    assert result is False
    db.close()


def test_has_booking_conflict_respects_exclude_booking_id_for_edit_flow():
    db = _make_session()
    user, room = _seed_user_and_room(db)
    existing = _create_booking(db, user.id, room.id, _utc_dt(10), _utc_dt(12))
    # Контролируем, что без exclude конфликт есть.
    assert has_booking_conflict(db, room.id, _utc_dt(10), _utc_dt(12)) is True

    same_slot_without_self = has_booking_conflict(
        db,
        room.id,
        _utc_dt(10),
        _utc_dt(12),
        exclude_booking_id=existing.id,
    )

    assert same_slot_without_self is False
    db.close()


def test_has_booking_conflict_finds_conflict_even_if_slot_is_wider():
    db = _make_session()
    user, room = _seed_user_and_room(db)
    _create_booking(db, user.id, room.id, _utc_dt(10), _utc_dt(11))

    result = has_booking_conflict(db, room.id, _utc_dt(9), _utc_dt(12))

    assert result is True
    db.close()


def test_has_booking_conflict_handles_minute_precision_intervals():
    db = _make_session()
    user, room = _seed_user_and_room(db)
    start = _utc_dt(14, 15)
    end = start + timedelta(minutes=45)
    _create_booking(db, user.id, room.id, start, end)

    result = has_booking_conflict(db, room.id, _utc_dt(14, 30), _utc_dt(15, 0))

    assert result is True
    db.close()

