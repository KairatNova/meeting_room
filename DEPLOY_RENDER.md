# Deploy to Render (Backend + Frontend)

Этот репозиторий — монорепо:
- `backend/` — FastAPI API
- `frontend/` — React (Vite) SPA

Ниже — деплой через **Render Blueprint** (`render.yaml`) в корне репозитория.

## 0) Перед стартом

1) Запушьте проект в GitHub.
2) Убедитесь, что вы не коммитите секреты (`backend/.env`, `frontend/.env`).

## 1) Deploy через Blueprint

1) В Render откройте **Blueprints** → **New Blueprint Instance**.
2) Выберите ваш GitHub repo.
3) Render прочитает `render.yaml` и создаст:
   - базу `meeting-room-db` (Postgres)
   - сервис `meeting-room-backend` (FastAPI)
   - сервис `meeting-room-frontend` (Static site)

## 2) Переменные окружения (важно)

### Backend (`meeting-room-backend`)

В `render.yaml` уже задано:
- `DATABASE_URL` — берётся из Render Postgres
- `SECRET_KEY` — генерируется автоматически
- `DEBUG=false`
- `UPLOAD_DIR=/var/data/uploads` (папка на диске Render)
- `CORS_ORIGINS` — **нужно проверить после деплоя фронта**

После первого деплоя фронта обновите `CORS_ORIGINS` на реальный домен фронта, например:

```text
https://meeting-room-frontend.onrender.com
```

Если вы переименовали сервисы, домены тоже изменятся.

### Frontend (`meeting-room-frontend`)

Задайте переменную:
- `VITE_API_URL` — базовый URL бэкенда (без хвоста `/api`), например:

```text
https://meeting-room-backend.onrender.com
```

Фронт ходит на `${VITE_API_URL}/api/...`.

## 3) Миграции БД

В `render.yaml` у бэкенда стартовая команда включает:

```bash
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

То есть миграции применяются **при каждом старте** сервиса.

## 4) Проверка после деплоя

Откройте:
- Backend health: `/health`
- Backend Swagger: `/docs`
- Frontend: главная страница

Если запросы с фронта падают с CORS — почти всегда нужно поправить `CORS_ORIGINS` на backend.

## 5) Загрузка фото (uploads)

Фото комнат раздаются бэкендом по `/uploads`.
В Blueprint подключён диск Render и `UPLOAD_DIR=/var/data/uploads`, чтобы файлы не пропадали при перезапуске.

