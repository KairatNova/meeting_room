# Deploy to Render (Backend + Frontend)

Этот файл фиксирует текущий процесс деплоя и все изменения, сделанные при переходе с Railway на Render.

## 1) Что изменили (Railway -> Render)

- Добавлен `render.yaml` (Render Blueprint) в корень репозитория.
- Деплой переведен с Railway на Render Blueprints.
- Инфраструктура поднимается из одного файла:
  - `meeting-room-db` (PostgreSQL),
  - `meeting-room-backend` (FastAPI web service),
  - `meeting-room-frontend` (Static site через `env: static`).
- Исправлен формат static-сервиса: `type: web` + `env: static`.
- Для free tier убран `disk` (persistent disk недоступен на бесплатном плане).
- `UPLOAD_DIR` для backend установлен в `uploads` (эпhemeral storage на free tier).

## 2) Текущие env-переменные

Ниже актуальные значения для текущих Render URL.

### Backend (`meeting-room-backend`)

- `DATABASE_URL` — из Render DB (`fromDatabase`)
- `SECRET_KEY` — `generateValue: true`
- `DEBUG=false`
- `CORS_ORIGINS=https://meeting-room-frontend-zb0p.onrender.com`
- `UPLOAD_DIR=uploads`
- для регистрации/подтверждения через Telegram обязательно:
  - `TELEGRAM_BOT_TOKEN=<your_token>`
  - `TELEGRAM_BOT_USERNAME=<bot_username_without_@>`

### Frontend (`meeting-room-frontend`)

- `VITE_API_URL=https://meeting-room-backend-8exb.onrender.com`

Важно: `VITE_API_URL` указывается без `/api` в конце.

## 3) Как работает Blueprint

1. Render читает `render.yaml` и создает сервисы.
2. Backend стартует командой:

```bash
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

3. Миграции БД применяются на старте backend.
4. Frontend собирается `npm ci && npm run build` и публикует `dist`.
5. Для SPA включен rewrite `/* -> /index.html`.

## 4) Что уже ломалось и как исправили

### Ошибка подключения с фронта

Текст: `Не удалось подключиться к серверу. Проверьте VITE_API_URL на frontend и CORS_ORIGINS на backend.`

Причина: неактуальные домены в env.

Фикс:
- синхронизированы `CORS_ORIGINS` и `VITE_API_URL` с реальными Render URL;
- после изменения env выполнен redeploy backend и frontend.

### Регистрация возвращала 503

Причина: в `register` есть обязательная проверка Telegram-конфига.

Фикс:
- добавить `TELEGRAM_BOT_TOKEN` и `TELEGRAM_BOT_USERNAME` в backend env.

### После нажатия Start код в Telegram не приходил

Причина: у Telegram webhook остался на старом Railway URL и отдавал 404.

Фикс: переустановить webhook на Render backend:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://meeting-room-backend-8exb.onrender.com/api/telegram/webhook
```

Проверка:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

В поле `url` должен быть Render backend URL, не Railway.

## 5) Мини-чеклист после деплоя

- Backend health: `https://meeting-room-backend-8exb.onrender.com/health`
- Backend docs: `https://meeting-room-backend-8exb.onrender.com/docs`
- Frontend: `https://meeting-room-frontend-zb0p.onrender.com`
- В Render env:
  - `CORS_ORIGINS` совпадает с frontend URL,
  - `VITE_API_URL` совпадает с backend URL,
  - Telegram env заполнены.
