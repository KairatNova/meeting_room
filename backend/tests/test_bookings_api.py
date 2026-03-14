from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database import Base, get_db
from app.main import create_app
from app.models import Booking, Room, User


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
        email="api-user@example.com",
        hashed_password="hashed",
        full_name="API User",
        display_name="API User",
        is_admin=False,
        is_verified=True,
    )
    room = Room(name="Room API", description="Room for API tests", capacity=8, amenities="Projector")
    db.add_all([user, room])
    db.commit()
    db.refresh(user)
    db.refresh(room)
    return user, room


def _seed_booking(db, *, user_id: int, room_id: int, start: datetime, end: datetime) -> Booking:
    booking = Booking(user_id=user_id, room_id=room_id, start_time=start, end_time=end)
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


def _make_client_with_session(db):
    app = create_app()

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


def test_create_booking_returns_201_for_valid_payload():
    db = _make_session()
    user, room = _seed_user_and_room(db)
    token = create_access_token(user.id)
    client = _make_client_with_session(db)

    start = datetime.now(timezone.utc) + timedelta(days=1, hours=1)
    end = start + timedelta(hours=2)
    response = client.post(
        "/api/bookings",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "room_id": room.id,
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["room_id"] == room.id
    assert body["user_id"] == user.id
    assert body["room_name"] == room.name
    db.close()


def test_create_booking_returns_409_when_time_slot_conflicts():
    db = _make_session()
    user, room = _seed_user_and_room(db)
    token = create_access_token(user.id)
    client = _make_client_with_session(db)

    existing_start = datetime.now(timezone.utc) + timedelta(days=1, hours=2)
    existing_end = existing_start + timedelta(hours=1)
    _seed_booking(db, user_id=user.id, room_id=room.id, start=existing_start, end=existing_end)

    response = client.post(
        "/api/bookings",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "room_id": room.id,
            "start_time": (existing_start + timedelta(minutes=15)).isoformat(),
            "end_time": (existing_end + timedelta(minutes=15)).isoformat(),
        },
    )

    assert response.status_code == 409
    assert "пересекается" in response.json()["detail"].lower()
    db.close()


def test_create_booking_returns_400_when_duration_more_than_six_hours():
    db = _make_session()
    user, room = _seed_user_and_room(db)
    token = create_access_token(user.id)
    client = _make_client_with_session(db)

    start = datetime.now(timezone.utc) + timedelta(days=1)
    end = start + timedelta(hours=7)
    response = client.post(
        "/api/bookings",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "room_id": room.id,
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
        },
    )

    assert response.status_code == 400
    assert "максимальная длительность" in response.json()["detail"].lower()
    db.close()

