# Backend: Meeting Rooms API

FastAPI + PostgreSQL + SQLAlchemy 2.0 + Alembic + JWT.

## Подготовка

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Отредактируйте .env: DATABASE_URL, SECRET_KEY
```

## База данных

Создайте БД и примените миграции:

```bash
# Создать БД в PostgreSQL (например: createdb meeting_rooms)
alembic upgrade head
```

При первой настройке создайте начальную миграцию (если папка `alembic/versions` пуста):

```bash
alembic revision --autogenerate -m "create users rooms bookings"
alembic upgrade head
```

## Запуск

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API: http://127.0.0.1:8000  
- Swagger: http://127.0.0.1:8000/docs  

## Структура

- `app/main.py` — приложение, CORS, роутеры
- `app/config.py` — настройки из .env
- `app/database.py` — сессия SQLAlchemy, `get_db()`
- `app/models/` — User, Room, Booking
- `app/schemas/` — Pydantic-модели запросов/ответов
- `app/api/` — роутеры auth, rooms, bookings, admin
- `app/core/` — security (JWT, пароли), dependencies (get_current_user, require_admin)
- `app/services/` — бизнес-логика (проверка конфликтов и т.д.)
- `alembic/` — миграции
