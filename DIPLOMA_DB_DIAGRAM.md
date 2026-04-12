# ER-диаграмма — коды для dbdiagram.io

Сайт: https://dbdiagram.io

---

## Способ 1 — DBML (рекомендуется)

> Откройте https://dbdiagram.io → кнопка **"Create your diagram"** →
> вставьте весь код ниже в левую панель редактора → диаграмма появится автоматически.

```dbml
// ──────────────────────────────────────────────
// Проект: Система бронирования переговорных комнат
// ──────────────────────────────────────────────

Table users {
  id               int          [pk, increment, note: "Уникальный идентификатор"]
  email            varchar(255) [unique, not null, note: "Email (логин)"]
  hashed_password  varchar(255) [not null, note: "Хэш пароля (bcrypt)"]
  full_name        varchar(255) [not null, note: "Полное имя"]
  display_name     varchar(255) [null, note: "Отображаемое имя"]
  phone            varchar(32)  [null, note: "Номер телефона"]
  telegram_username varchar(64) [null, note: "Ник в Telegram (без @)"]
  telegram_chat_id bigint       [null, note: "ID диалога с ботом"]
  birth_date       date         [null, note: "Дата рождения"]
  gender           varchar(16)  [null, note: "Пол"]
  citizenship      varchar(64)  [null, note: "Гражданство"]
  is_admin         boolean      [not null, default: false, note: "Администратор"]
  is_verified      boolean      [not null, default: false, note: "Верифицирован"]
  created_at       timestamptz  [not null, default: `now()`, note: "Дата регистрации"]
  updated_at       timestamptz  [not null, default: `now()`, note: "Дата обновления"]

  indexes {
    email [unique]
  }

  Note: "Пользователь системы: хранит данные авторизации и профиля"
}

Table rooms {
  id          int          [pk, increment]
  name        varchar(255) [not null, note: "Название комнаты"]
  description text         [null, note: "Описание"]
  capacity    int          [not null, default: 1, note: "Вместимость (человек)"]
  amenities   varchar(500) [null, note: "Оборудование, удобства (через запятую)"]
  region      varchar(128) [null, note: "Регион / область"]
  city        varchar(128) [null, note: "Город"]
  district    varchar(128) [null, note: "Район"]
  address     varchar(255) [null, note: "Адрес"]
  created_at  timestamptz  [not null, default: `now()`]

  indexes {
    name
    region
    city
    district
  }

  Note: "Переговорная комната: параметры и местоположение"
}

Table room_images {
  id      int          [pk, increment]
  room_id int          [not null, ref: > rooms.id, note: "Ссылка на комнату (CASCADE DELETE)"]
  path    varchar(512) [not null, note: "Относительный путь к файлу от корня /uploads"]

  indexes {
    room_id
  }

  Note: "Фотографии комнаты. Удаляются вместе с комнатой (CASCADE)"
}

Table bookings {
  id         int         [pk, increment]
  user_id    int         [not null, ref: > users.id, note: "Кто забронировал (CASCADE DELETE)"]
  room_id    int         [not null, ref: > rooms.id, note: "Какая комната (CASCADE DELETE)"]
  start_time timestamptz [not null, note: "Начало бронирования (UTC)"]
  end_time   timestamptz [not null, note: "Конец бронирования (UTC)"]
  created_at timestamptz [not null, default: `now()`]

  indexes {
    (room_id, start_time, end_time) [name: "ix_bookings_room_time", note: "Быстрый поиск конфликтов"]
  }

  Note: "Бронирование: пользователь занимает комнату на интервал времени"
}

Table room_reviews {
  id         int         [pk, increment]
  room_id    int         [not null, ref: > rooms.id, note: "Комната (CASCADE DELETE)"]
  user_id    int         [not null, ref: > users.id, note: "Автор отзыва (CASCADE DELETE)"]
  rating     int         [not null, note: "Оценка от 1 до 10"]
  comment    text        [not null, note: "Текст отзыва"]
  created_at timestamptz [not null, default: `now()`]

  indexes {
    room_id
    user_id
  }

  Note: "Отзыв пользователя о комнате"
}

Table email_verification_codes {
  id         int         [pk, increment]
  user_id    int         [unique, not null, ref: > users.id, note: "1:1 к пользователю (CASCADE DELETE)"]
  code       varchar(6)  [not null, note: "6-значный код подтверждения"]
  expires_at timestamptz [not null, note: "Время истечения (TTL 10 минут)"]

  Note: "Код для подтверждения email при регистрации. Один код на пользователя"
}

Table login_verification_codes {
  id         int         [pk, increment]
  user_id    int         [unique, not null, ref: > users.id, note: "1:1 к пользователю (CASCADE DELETE)"]
  code       varchar(6)  [not null, note: "6-значный код для входа (2FA)"]
  expires_at timestamptz [not null, note: "Время истечения"]

  Note: "Одноразовый код для входа. Отправляется в Telegram или на email"
}

Table telegram_pending_links {
  id         int         [pk, increment]
  token      varchar(64) [unique, not null, note: "Токен из ссылки t.me/bot?start=TOKEN"]
  user_id    int         [not null, ref: > users.id, note: "Кому принадлежит токен (CASCADE DELETE)"]
  expires_at timestamptz [not null, note: "Время истечения ссылки"]

  indexes {
    token [unique]
  }

  Note: "Временная ссылка для привязки Telegram к аккаунту"
}

Table password_reset_codes {
  id         int         [pk, increment]
  user_id    int         [unique, not null, ref: > users.id, note: "1:1 к пользователю (CASCADE DELETE)"]
  code       varchar(6)  [not null, note: "6-значный код сброса пароля"]
  expires_at timestamptz [not null, note: "Время истечения"]

  Note: "Код для сброса пароля (сценарий «Забыли пароль»)"
}
```

---

## Способ 2 — SQL (PostgreSQL)

> На сайте dbdiagram.io выберите **Import → Import from SQL** → вставьте код ниже.

```sql
-- ──────────────────────────────────────────────────────────────────────────
-- Система бронирования переговорных комнат
-- PostgreSQL CREATE TABLE statements
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE users (
    id               SERIAL       PRIMARY KEY,
    email            VARCHAR(255) NOT NULL UNIQUE,
    hashed_password  VARCHAR(255) NOT NULL,
    full_name        VARCHAR(255) NOT NULL,
    display_name     VARCHAR(255),
    phone            VARCHAR(32),
    telegram_username VARCHAR(64),
    telegram_chat_id BIGINT,
    birth_date       DATE,
    gender           VARCHAR(16),
    citizenship      VARCHAR(64),
    is_admin         BOOLEAN      NOT NULL DEFAULT FALSE,
    is_verified      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_users_email ON users (email);

-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE rooms (
    id          SERIAL       PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    capacity    INTEGER      NOT NULL DEFAULT 1,
    amenities   VARCHAR(500),
    region      VARCHAR(128),
    city        VARCHAR(128),
    district    VARCHAR(128),
    address     VARCHAR(255),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_rooms_name     ON rooms (name);
CREATE INDEX ix_rooms_region   ON rooms (region);
CREATE INDEX ix_rooms_city     ON rooms (city);
CREATE INDEX ix_rooms_district ON rooms (district);

-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE room_images (
    id      SERIAL       PRIMARY KEY,
    room_id INTEGER      NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    path    VARCHAR(512) NOT NULL
);

CREATE INDEX ix_room_images_room_id ON room_images (room_id);

-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE bookings (
    id         SERIAL      PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id    INTEGER     NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time   TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Составной индекс для быстрой проверки конфликтов
CREATE INDEX ix_bookings_room_time ON bookings (room_id, start_time, end_time);

-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE room_reviews (
    id         SERIAL      PRIMARY KEY,
    room_id    INTEGER     NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating     INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 10),
    comment    TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_room_reviews_room_id ON room_reviews (room_id);
CREATE INDEX ix_room_reviews_user_id ON room_reviews (user_id);

-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE email_verification_codes (
    id         SERIAL      PRIMARY KEY,
    user_id    INTEGER     NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    code       VARCHAR(6)  NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE login_verification_codes (
    id         SERIAL      PRIMARY KEY,
    user_id    INTEGER     NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    code       VARCHAR(6)  NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE telegram_pending_links (
    id         SERIAL      PRIMARY KEY,
    token      VARCHAR(64) NOT NULL UNIQUE,
    user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX ix_telegram_pending_links_token ON telegram_pending_links (token);

-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE password_reset_codes (
    id         SERIAL      PRIMARY KEY,
    user_id    INTEGER     NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    code       VARCHAR(6)  NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);
```

---

## Краткая справка по таблицам

| Таблица | Строк в MVP | Назначение |
|---------|-------------|-----------|
| `users` | ~10–100 | Пользователи и администраторы |
| `rooms` | ~5–50 | Переговорные комнаты |
| `room_images` | ~0–10 на комнату | Фотографии комнат |
| `bookings` | Растёт постоянно | Все бронирования |
| `room_reviews` | ~0–N на комнату | Отзывы пользователей |
| `email_verification_codes` | 1 на незавершённого пользователя | Коды верификации при регистрации |
| `login_verification_codes` | 1 на активный вход | Коды 2FA при входе |
| `telegram_pending_links` | 1 на незавершённую привязку | Токены для привязки Telegram |
| `password_reset_codes` | 1 на активный сброс | Коды восстановления пароля |

## Связи (итог)

```
users ──1:N──► bookings          ◄──N:1── rooms
users ──1:N──► room_reviews      ◄──N:1── rooms
rooms ──1:N──► room_images
users ──1:1──► email_verification_codes
users ──1:1──► login_verification_codes
users ──1:1──► telegram_pending_links
users ──1:1──► password_reset_codes
```

> **CASCADE DELETE везде:** удаление пользователя или комнаты автоматически удаляет
> все связанные записи (брони, отзывы, фото, коды).
