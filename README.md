# Meeting Rooms — бронирование переговорных комнат

Учебный/дипломный проект: веб-приложение для бронирования переговорных с регистрацией, подтверждением email, календарём занятости и админ-панелью.

- **Backend:** FastAPI, PostgreSQL, SQLAlchemy, Alembic, JWT, SMTP (код на email)
- **Frontend:** React, Vite, Tailwind CSS, FullCalendar

## Быстрый старт

### Требования

- Python 3.11+
- Node.js 18+
- PostgreSQL

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # заполнить DATABASE_URL, SECRET_KEY, при необходимости SMTP
alembic upgrade head
uvicorn app.main:app --reload --port 8001
```

API: http://127.0.0.1:8001/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Приложение: http://localhost:5173 (прокси на backend 8001 настроен в `vite.config.ts`).

Для production можно указать backend URL через переменную окружения:

```bash
cp .env.example .env
# VITE_API_URL=https://your-backend.up.railway.app
```

### Первый админ

После регистрации пользователя назначить его админом:

```bash
cd backend
python scripts/make_admin.py your@email.com
```

Либо в PostgreSQL: `UPDATE users SET is_admin = true, is_verified = true WHERE email = 'your@email.com';`

## Структура репозитория

- `backend/` — FastAPI-приложение, миграции Alembic, скрипты
- `frontend/` — React SPA (Vite)
- `SUMMARY.md` — что сделано, что осталось, как выгрузить на GitHub
- `PLAN_DEV.md` — детальный план разработки

## Выгрузка на GitHub

Один репозиторий: и backend, и frontend в одном репо (папки `backend/` и `frontend/`). Пушить отдельно не нужно.

```bash
git init
git add .
git commit -m "Meeting rooms app (backend + frontend)"
git remote add origin https://github.com/USERNAME/meeting_room.git
git push -u origin main
```

Убедитесь, что в репозиторий не попадают `backend/.env`, `backend/.venv/`, `frontend/node_modules/` (см. корневой `.gitignore`).

## Деплой и презентация

- Инструкция деплоя в Railway: `DEPLOY_RAILWAY.md`
- Понятный сценарий защиты для не-IT: `PRESENTATION_GUIDE.md`
