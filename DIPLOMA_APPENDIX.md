# Приложения к дипломной работе

**Тема:** Разработка веб-приложения для бронирования переговорных комнат

---

## Приложение А — ER-диаграмма базы данных

### А.1. Схема связей (текстовое описание)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         СХЕМА БАЗЫ ДАННЫХ                           │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐         ┌──────────────────────────────┐
│         users           │         │          rooms               │
├─────────────────────────┤         ├──────────────────────────────┤
│ id            INTEGER PK│         │ id           INTEGER PK      │
│ name          VARCHAR   │         │ name         VARCHAR  NOT NULL│
│ email         VARCHAR UK│         │ capacity     INTEGER  NOT NULL│
│ hashed_password VARCHAR │         │ location     VARCHAR  NULL    │
│ telegram_username VARCHAR│         │ description  TEXT     NULL    │
│ phone         VARCHAR   │         │ amenities    TEXT     NULL    │
│ telegram_chat_id BIGINT │         │ is_active    BOOLEAN         │
│ is_verified   BOOLEAN   │         └──────────────┬───────────────┘
│ is_admin      BOOLEAN   │                        │ 1
│ created_at    TIMESTAMP │                        │
└──────────┬──────────────┘                        │ N
           │ 1                         ┌────────────▼───────────────┐
           │                           │        room_photos         │
           │ N                         ├────────────────────────────┤
┌──────────▼──────────────┐           │ id      INTEGER PK         │
│   email_verification    │           │ room_id INTEGER FK → rooms  │
│       _codes            │           │ url     VARCHAR NOT NULL    │
├─────────────────────────┤           └────────────────────────────┘
│ id            INTEGER PK│
│ user_id       INTEGER FK│──────────────────────────────────────────
│ code          VARCHAR(6)│         ┌──────────────────────────────┐
│ expires_at    TIMESTAMP │         │         bookings             │
└─────────────────────────┘         ├──────────────────────────────┤
           │                        │ id         INTEGER PK        │
           │                        │ room_id    INTEGER FK→rooms  │◄──┐
           └──────── users.id ──────►│ user_id    INTEGER FK→users │   │
                                    │ start_time TIMESTAMP NOT NULL│   │
                                    │ end_time   TIMESTAMP NOT NULL│   │
                                    │ status     VARCHAR(20)       │   │
                                    │ created_at TIMESTAMP         │   │
                                    └──────────────────────────────┘   │
                                                                       │
                                    rooms ─────────────────────────────┘
```

### А.2. Описание связей

| Связь | Тип | Поведение |
|-------|-----|-----------|
| `rooms` → `room_photos` | 1 : N | Каскадное удаление фото при удалении комнаты |
| `rooms` → `bookings` | 1 : N | Брони привязаны к комнате |
| `users` → `bookings` | 1 : N | Брони принадлежат пользователю |
| `users` → `email_verification_codes` | 1 : 1 | Активный код верификации |

> **Примечание:** Вставьте ER-диаграмму, экспортированную из pgAdmin 4 или dbdiagram.io, на место этого раздела в итоговом документе.

---

## Приложение Б — Листинги ключевых фрагментов кода

---

### Б.1. Сервис проверки конфликтов бронирований

**Файл:** `backend/app/services/booking_conflict.py`

```python
"""
Проверка пересечения бронирований по комнате и интервалу времени.
Два слота пересекаются: start_time < existing.end_time AND end_time > existing.start_time.
"""
from datetime import datetime
from datetime import timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.booking import Booking


def has_booking_conflict(
    db: Session,
    room_id: int,
    start_time: datetime,
    end_time: datetime,
    exclude_booking_id: Optional[int] = None,
    buffer_minutes: int = 0,
) -> bool:
    """
    Проверить, есть ли в комнате room_id бронирование,
    пересекающееся с [start_time, end_time].
    exclude_booking_id — не учитывать бронь с этим id (для редактирования).
    buffer_minutes — буфер между бронями (расширяет проверяемый интервал).
    Возвращает True при наличии конфликта.
    """
    buffer_delta = timedelta(minutes=max(0, buffer_minutes))
    check_start = start_time - buffer_delta
    check_end = end_time + buffer_delta

    stmt = (
        select(Booking.id)
        .where(Booking.room_id == room_id)
        .where(Booking.start_time < check_end)
        .where(Booking.end_time > check_start)
        .limit(1)
    )
    if exclude_booking_id is not None:
        stmt = stmt.where(Booking.id != exclude_booking_id)
    return db.execute(stmt).scalar_one_or_none() is not None
```

---

### Б.2. Роутер бронирований (создание, список, отмена)

**Файл:** `backend/app/api/bookings.py`

```python
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


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    data: BookingCreate,
    db: DbSession,
    user: CurrentUser,
) -> BookingResponse:
    """
    Создать бронирование.
    Проверяет длительность, конфликты (с буфером 15 мин) и дату в прошлом.
    При конфликте возвращает 409 Conflict.
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
            detail=f"Минимальная длительность бронирования — "
                   f"{MIN_BOOKING_DURATION_MINUTES} минут",
        )
    if duration_seconds > MAX_BOOKING_DURATION_HOURS * 3600:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Максимальная длительность бронирования — "
                   f"{MAX_BOOKING_DURATION_HOURS} часов",
        )
    if start < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя создать бронирование в прошлом",
        )

    room = db.get(Room, data.room_id)
    if room is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Комната не найдена",
        )

    if has_booking_conflict(
        db,
        data.room_id,
        start,
        end,
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


@router.get("/{booking_id}", response_model=BookingResponse)
def get_booking(
    booking_id: int,
    db: DbSession,
    user: CurrentUser,
) -> BookingResponse:
    """Детали одной брони. Доступно владельцу брони или администратору."""
    booking = db.execute(
        select(Booking)
        .options(selectinload(Booking.room))
        .where(Booking.id == booking_id)
    ).scalar_one_or_none()

    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Бронирование не найдено",
        )
    if booking.user_id != user.id and not bool(getattr(user, "is_admin", False)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этому бронированию",
        )
    return booking_to_response(booking)


@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_booking(
    booking_id: int,
    db: DbSession,
    user: CurrentUser,
) -> None:
    """
    Отменить своё бронирование.
    Запрещено: чужие брони, прошедшие брони, отмена менее чем за 30 мин до начала.
    """
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Бронирование не найдено",
        )
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
```

---

### Б.3. Telegram Bot Webhook

**Файл:** `backend/app/api/telegram_webhook.py`

```python
"""
Webhook для Telegram Bot: при /start TOKEN привязываем chat_id к пользователю
и отправляем код подтверждения.
"""
import logging
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from sqlalchemy import select

from app.core.dependencies import DbSession
from app.models.user import User
from app.models.telegram_pending_link import TelegramPendingLink
from app.models.email_verification import EmailVerificationCode
from app.config import get_settings
from app.services.telegram import send_verification_code, send_message

router = APIRouter()
logger = logging.getLogger(__name__)
PHONE_RE = re.compile(r"[^\d+]")


def _normalize_phone(value: str) -> str:
    """Нормализует номер телефона к формату +7XXXXXXXXXX."""
    raw = (value or "").strip()
    if not raw:
        return ""
    has_plus = raw.startswith("+")
    digits = "".join(ch for ch in raw if ch.isdigit())
    if not digits:
        return ""
    if not has_plus:
        if len(digits) == 11 and digits.startswith("8"):
            digits = "7" + digits[1:]
        return f"+{digits}"
    return f"+{digits}"


@router.post("/telegram/webhook")
async def telegram_webhook(request: Request, db: DbSession) -> dict:
    """
    Принимает Update от Telegram.

    Сценарии:
    1. /start TOKEN — находит TelegramPendingLink по токену,
       привязывает chat_id к пользователю, отправляет код.
    2. contact-сообщение — верифицирует пользователя по номеру телефона.
    """
    try:
        body = await request.json()
    except Exception as e:
        logger.warning("Telegram webhook invalid JSON: %s", e)
        return {"ok": True}

    message = body.get("message") or body.get("edited_message")
    if not message:
        return {"ok": True}

    chat = message.get("chat") or {}
    chat_id = chat.get("id")
    contact = message.get("contact") or {}
    from_user = message.get("from") or {}

    # Верификация по номеру телефона (contact-сообщение)
    if chat_id is not None and contact:
        user = db.execute(
            select(User).where(User.telegram_chat_id == chat_id)
        ).scalar_one_or_none()
        if user and user.phone:
            expected_phone = _normalize_phone(user.phone)
            incoming_phone = _normalize_phone(contact.get("phone_number") or "")
            if expected_phone and incoming_phone == expected_phone:
                verification = db.execute(
                    select(EmailVerificationCode)
                    .where(EmailVerificationCode.user_id == user.id)
                ).scalar_one_or_none()
                now = datetime.now(timezone.utc)
                if verification and verification.expires_at > now:
                    settings = get_settings()
                    send_verification_code(
                        chat_id,
                        verification.code,
                        settings.email_verification_code_expire_minutes,
                    )
                else:
                    send_message(chat_id, "⏱ Код истёк. Зарегистрируйтесь заново.")
                return {"ok": True}
            send_message(chat_id, "Номер не совпадает с указанным при регистрации.")
            return {"ok": True}

    # Проверка /start TOKEN
    text = (message.get("text") or "").strip()
    if not text.startswith("/start"):
        return {"ok": True}

    parts = text.split(maxsplit=1)
    token = (parts[1].strip() if len(parts) > 1 else None) or ""
    if not token or chat_id is None:
        return {"ok": True}

    telegram_username = from_user.get("username")
    if telegram_username:
        telegram_username = telegram_username.lower()

    # Поиск записи ожидания привязки по токену
    link = db.execute(
        select(TelegramPendingLink)
        .where(TelegramPendingLink.token == token)
    ).scalar_one_or_none()
    if not link:
        logger.warning("Telegram start: token not found in DB")
        return {"ok": True}

    user = db.execute(
        select(User).where(User.id == link.user_id)
    ).scalar_one_or_none()
    if not user:
        return {"ok": True}

    # Привязка chat_id к пользователю
    user.telegram_chat_id = chat_id
    if user.telegram_username:
        if not telegram_username or telegram_username != user.telegram_username:
            send_message(
                chat_id,
                "Этот аккаунт не совпадает с указанным при регистрации @username.",
            )
            db.commit()
            return {"ok": True}
    elif telegram_username:
        user.telegram_username = telegram_username
    db.add(user)

    # Отправка кода верификации
    verification = db.execute(
        select(EmailVerificationCode)
        .where(EmailVerificationCode.user_id == user.id)
    ).scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if verification and verification.expires_at > now:
        if user.phone and not user.telegram_username:
            send_message(
                chat_id,
                "Отправьте контакт (Скрепка → Контакт → Отправить мой номер).",
            )
        else:
            settings = get_settings()
            send_verification_code(
                chat_id,
                verification.code,
                settings.email_verification_code_expire_minutes,
            )
    else:
        send_message(chat_id, "⏱ Код истёк. Откройте новую ссылку со страницы регистрации.")

    db.commit()
    return {"ok": True}
```

---

### Б.4. Контекст аутентификации (Frontend)

**Файл:** `frontend/src/context/AuthContext.tsx`

```typescript
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authApi } from "../api/auth";
import type { User, RegisterResponse, LoginRequestResponse } from "../types/api";

interface AuthState {
  user: User | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  /** Регистрация: имя, Telegram (@username или номер), почта, пароль. */
  register: (
    fullName: string,
    telegram: string,
    email: string,
    password: string
  ) => Promise<RegisterResponse>;
  /** Шаг 1 входа: отправить код в Telegram/email. */
  loginRequest: (login: string, password: string) => Promise<LoginRequestResponse>;
  /** Шаг 2: ввести код и получить JWT. */
  loginVerify: (login: string, code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const TOKEN_KEY = "access_token";

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  /** Загружает профиль текущего пользователя по сохранённому JWT-токену. */
  const loadUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setState({ user: null, loading: false });
      return;
    }
    try {
      const user = await authApi.me();
      setState({ user: user ?? null, loading: false });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setState({ user: null, loading: false });
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { access_token } = await authApi.login({ email, password });
      localStorage.setItem(TOKEN_KEY, access_token);
      await loadUser();
    },
    [loadUser]
  );

  const register = useCallback(
    async (
      fullName: string,
      telegram: string,
      email: string,
      password: string
    ): Promise<RegisterResponse> => {
      return authApi.register({
        full_name: fullName,
        telegram: telegram.trim(),
        email,
        password,
      });
    },
    []
  );

  const loginRequest = useCallback(
    async (login: string, password: string) =>
      authApi.loginRequest({ login: login.trim(), password }),
    []
  );

  const loginVerify = useCallback(
    async (login: string, code: string) => {
      const res = await authApi.loginVerify({
        login: login.trim(),
        verification_code: code.trim(),
      });
      localStorage.setItem(TOKEN_KEY, res.access_token);
      await loadUser();
    },
    [loadUser]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, register, loginRequest, loginVerify, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

---

### Б.5. Страница детальной информации о комнате (ключевые фрагменты)

**Файл:** `frontend/src/pages/RoomDetailPage.tsx`

```typescript
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { DatesSetArg } from "@fullcalendar/core";
import { roomsApi } from "../api/rooms";
import { bookingsApi } from "../api/bookings";
import { useAuth } from "../context/AuthContext";
import { ApiError, mediaUrl } from "../api/client";
import { EmptyStateCard } from "../components/EmptyStateCard";
import { SkeletonBlocks } from "../components/SkeletonBlocks";
import { useFavoriteRooms } from "../hooks/useFavoriteRooms";
import { useRecentRooms } from "../hooks/useRecentRooms";

export function RoomDetailPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calendarRange, setCalendarRange] = useState(null);
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { isFavorite, toggleFavorite } = useFavoriteRooms();
  const { pushRecent } = useRecentRooms();

  const id = roomId ? parseInt(roomId, 10) : NaN;

  // Загрузка данных комнаты
  useEffect(() => {
    if (isNaN(id)) { setLoading(false); return; }
    setLoading(true);
    roomsApi.get(id).then(setRoom).catch(() => setRoom(null)).finally(() => setLoading(false));
  }, [id]);

  // Добавление в историю просмотров
  useEffect(() => {
    if (room) pushRecent(room.id);
  }, [room?.id]);

  // Загрузка бронирований при смене диапазона календаря
  useEffect(() => {
    if (!calendarRange || isNaN(id)) return;
    bookingsApi.list({
      room_id: id,
      from_time: calendarRange.start.toISOString(),
      to_time: calendarRange.end.toISOString(),
    }).then(setBookings);
  }, [id, calendarRange]);

  // События для FullCalendar
  const calendarEvents = bookings.map((b) => ({
    id: String(b.id),
    title: "Занято",
    start: b.start_time,
    end: b.end_time,
  }));

  // Обработка отправки формы бронирования
  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!user) { setSubmitError("Войдите в систему"); return; }

    const startDate = new Date(`${formDate}T${formStartTime}:00`);
    const endDate   = new Date(`${formDate}T${formEndTime}:00`);

    if (endDate <= startDate) {
      setSubmitError("Время окончания должно быть позже начала"); return;
    }
    const durationMin = (endDate - startDate) / 60000;
    if (durationMin < 30)  { setSubmitError("Минимум 30 минут"); return; }
    if (durationMin > 360) { setSubmitError("Максимум 6 часов"); return; }

    setSubmitting(true);
    try {
      await bookingsApi.create({
        room_id: id,
        start_time: startDate.toISOString(),
        end_time:   endDate.toISOString(),
      });
      setFormDate(""); setFormStartTime(""); setFormEndTime("");
      // Обновляем календарь
      bookingsApi.list({ room_id: id }).then(setBookings);
    } catch (err) {
      setSubmitError(err instanceof ApiError && err.status === 409
        ? "Выбранное время занято. Выберите другой слот."
        : err.message ?? "Ошибка создания брони"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <SkeletonBlocks count={2} className="h-36" />;
  if (!room)   return <EmptyStateCard title="Комната не найдена" actionTo="/rooms" />;

  return (
    <div className="space-y-6">
      {/* Фото и параметры комнаты */}
      <section className="app-card overflow-hidden">
        <div className="h-60 bg-slate-100">
          {room.photos?.[0] ? (
            <img src={mediaUrl(room.photos[0].url)} alt={room.name} className="w-full h-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">Нет фото</div>
          )}
        </div>
        <div className="p-5 space-y-2">
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-semibold">{room.name}</h1>
            <button
              type="button"
              onClick={() => toggleFavorite(room.id)}
              className={isFavorite(room.id) ? "text-amber-500 text-xl" : "text-gray-300 text-xl"}
              aria-label="Добавить/убрать из избранного"
            >★</button>
          </div>
          <p className="text-gray-600">{room.description}</p>
          <p className="text-sm text-slate-600">Вместимость: {room.capacity} чел.</p>
        </div>
      </section>

      {/* Форма бронирования */}
      <section className="app-card p-4">
        <h2 className="text-lg font-semibold mb-3">Забронировать</h2>
        {submitError && <p className="mb-3 text-sm text-red-700">{submitError}</p>}
        <form onSubmit={handleSubmitBooking} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="field-label">Дата</label>
            <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
              required className="field-input" />
          </div>
          <div>
            <label className="field-label">Начало</label>
            <input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)}
              required className="field-input" />
          </div>
          <div>
            <label className="field-label">Конец</label>
            <input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)}
              required className="field-input" />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={submitting || !user} className="btn-primary w-full">
              {submitting ? "Создание..." : "Забронировать"}
            </button>
          </div>
        </form>
      </section>

      {/* Календарь занятости (FullCalendar) */}
      <section className="app-card p-2 overflow-x-auto">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin]}
          initialView="timeGridDay"
          headerToolbar={{ left: "prev,next", center: "title", right: "timeGridDay,timeGridWeek" }}
          locale="ru"
          events={calendarEvents}
          datesSet={(arg: DatesSetArg) => setCalendarRange({ start: arg.start, end: arg.end })}
          contentHeight={320}
          slotMinTime="08:00:00"
          slotMaxTime="21:00:00"
          allDaySlot={false}
        />
      </section>
    </div>
  );
}
```

---

## Приложение В — Скриншоты интерфейса

> **Инструкция:** Вставьте скриншоты вместо описаний ниже. Рекомендуемый размер: ширина 1280px, формат PNG.

---

**В.1. Главная страница — дашборд авторизованного пользователя**

```
[ Здесь вставить скриншот: /  (главная страница после входа) ]

На скриншоте должны быть видны:
- Блок "Ближайшие бронирования"
- Блок "Свободно сейчас"
- Блок "Избранные комнаты"
- Блок "Недавно просмотренные"
```

---

**В.2. Страница комнаты с фотографией и параметрами**

```
[ Здесь вставить скриншот: /rooms/:id ]

На скриншоте должны быть видны:
- Фотография комнаты
- Название, вместимость, местоположение
- Кнопка "В избранное" (★)
- Список удобств
```

---

**В.3. Форма бронирования и обработка конфликта**

```
[ Здесь вставить два скриншота: ]
a) Форма бронирования (поля даты, времени, кнопка "Забронировать")
b) Сообщение об ошибке 409 "Выбранное время занято"
```

---

**В.4. Календарь занятости комнаты (FullCalendar)**

```
[ Здесь вставить скриншот: вид "Неделя" или "День" с FullCalendar ]

На скриншоте должны быть видны:
- Занятые слоты (цветные блоки)
- Свободные временные ячейки
- Кнопки переключения вида (День / Неделя)
```

---

**В.5. Страница «Мои бронирования»**

```
[ Здесь вставить скриншот: /my-bookings ]

На скриншоте должны быть видны:
- Список активных бронирований с датами
- Ссылки на детальные страницы брони
```

---

**В.6. Страница деталей бронирования**

```
[ Здесь вставить скриншот: /my-bookings/:id ]

На скриншоте должны быть видны:
- Информация о комнате, дате и времени брони
- Кнопка "Отменить бронирование"
```

---

**В.7. Административная панель — управление комнатами**

```
[ Здесь вставить скриншот: /admin (вкладка комнат) ]

На скриншоте должны быть видны:
- Таблица комнат с кнопками редактирования и удаления
- Форма добавления/редактирования комнаты
- Область загрузки фотографий с превью
```

---

**В.8. Административная панель — управление администраторами**

```
[ Здесь вставить скриншот: /admin (раздел "Администраторы") ]

На скриншоте должны быть видны:
- Список текущих администраторов
- Форма назначения нового администратора по email
- Кнопки "Снять роль"
```

---

**В.9. Swagger UI — документация REST API**

```
[ Здесь вставить скриншот: /docs ]

На скриншоте должны быть видны:
- Список групп эндпоинтов (auth, rooms, bookings, admin)
- Раскрытый пример одного эндпоинта с параметрами и ответом
```

---

**В.10. Страница регистрации со спиннером загрузки**

```
[ Здесь вставить скриншот: /register ]

На скриншоте должны быть видны:
- Поля: Имя, Telegram (@username или номер), Email, Пароль
- Кнопка с анимацией загрузки (спиннер) в процессе отправки
```

---

## Приложение Г — Конфигурационные файлы

---

### Г.1. Файл конфигурации Render Blueprint

**Файл:** `render.yaml` (корень проекта)

```yaml
databases:
  - name: meeting-room-db
    plan: free

services:
  - type: web
    name: meeting-room-backend
    runtime: python
    rootDir: backend
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /health
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: meeting-room-db
          property: connectionString
      - key: SECRET_KEY
        generateValue: true
      - key: DEBUG
        value: "false"
      # Обновить после деплоя фронтенда
      - key: CORS_ORIGINS
        value: https://meeting-room-frontend-zb0p.onrender.com
      # Бесплатный план: диски не поддерживаются, загрузки временные
      - key: UPLOAD_DIR
        value: uploads

  - type: web
    env: static
    name: meeting-room-frontend
    rootDir: frontend
    buildCommand: npm ci && npm run build
    staticPublishPath: dist
    envVars:
      # Обновить после деплоя бэкенда
      - key: VITE_API_URL
        value: https://meeting-room-backend-8exb.onrender.com
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

---

### Г.2. Переменные окружения Backend

**Файл:** `backend/.env.example`

```ini
# Скопируйте в .env и заполните значения.

# ─── База данных PostgreSQL ───────────────────────────────────────────────────
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/meeting_rooms

# ─── JWT ─────────────────────────────────────────────────────────────────────
# Секрет для подписи токенов (минимум 32 символа, обязательно сменить в prod)
# SECRET_KEY=your-secret-key-min-32-chars

# ─── Режим отладки ───────────────────────────────────────────────────────────
# DEBUG=false

# ─── CORS ────────────────────────────────────────────────────────────────────
# Через запятую, без пробелов
# CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
# Production:
# CORS_ORIGINS=https://your-frontend.onrender.com

# ─── Telegram Bot ─────────────────────────────────────────────────────────────
# Создайте бота через @BotFather, укажите токен и username (без @)
# TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
# TELEGRAM_BOT_USERNAME=YourMeetingBot
#
# После деплоя зарегистрируйте webhook:
#   curl "https://api.telegram.org/bot<TOKEN>/setWebhook\
#         ?url=https://ВАШ_ДОМЕН/api/telegram/webhook"

# ─── SMTP (опционально, для email-кодов) ─────────────────────────────────────
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your@gmail.com
# SMTP_PASSWORD=your-app-password
# SMTP_FROM_EMAIL=noreply@yourdomain.com
# EMAIL_VERIFICATION_CODE_EXPIRE_MINUTES=10
```

---

### Г.3. Переменные окружения Frontend

**Файл:** `frontend/.env.example`

```ini
# Для локальной разработки — оставьте пустым (используется прокси Vite):
# VITE_API_URL=

# Для production (URL backend-сервиса на Render/Railway):
# VITE_API_URL=https://your-backend.onrender.com
VITE_API_URL=
```

---

### Г.4. Конфигурация Vite (dev-прокси)

**Файл:** `frontend/vite.config.ts`

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // В режиме разработки /api/* → backend на порту 8000
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Статические файлы (фотографии комнат)
      "/uploads": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

---

*Конец приложений*
