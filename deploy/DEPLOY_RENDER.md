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

## 6) Первые пользователи и админы (база Render)

Пользователя **нельзя** «вставить» только SQL без пароля: в таблице `users` хранится **хэш** пароля (`hashed_password`). Поэтому порядок такой:

1. Зарегистрируйте аккаунт через сайт (полный цикл с Telegram, пока `is_verified = false` до ввода кода).
2. После того как пользователь есть в БД, назначьте ему админа одним из способов ниже.

### Способ A — скрипт `make_admin.py` с вашего ПК

1. В Render: **Database** → **meeting-room-db** → скопируйте **External Database URL** (или строку подключения, которую можно использовать с вашего компьютера).
2. Локально в папке `backend`:

```bash
cd backend
# Windows PowerShell:
$env:DATABASE_URL = "postgresql://..."   # вставьте URL из Render
python scripts/make_admin.py your@email.com
```

На Linux/macOS:

```bash
cd backend
export DATABASE_URL="postgresql://..."
python scripts/make_admin.py your@email.com
```

Скрипт выставит `is_admin = true` и `is_verified = true` для указанного email.

### Способ B — SQL в любом клиенте PostgreSQL

Подключитесь к той же БД (DBeaver, pgAdmin, `psql`) и выполните (email в нижнем регистре, как в приложении):

```sql
UPDATE users
SET is_admin = true, is_verified = true
WHERE email = 'your@email.com';
```

Проверка:

```sql
SELECT id, email, is_admin, is_verified FROM users WHERE email = 'your@email.com';
```

### Замечания

- **Внутренний** URL БД (`dpg-...-a`) из Render работает только из сервисов Render; для запуска скрипта с ноутбука нужен **external** URL, если Render его выдаёт для вашего плана.
- Создавать «первого пользователя» чистым SQL без приложения можно только если вручную сгенерировать bcrypt-хэш пароля — проще всего зарегистрироваться через UI.

## 7) Telegram-бот на Render (полная настройка)

Бот не «живёт» на Render отдельно: он работает через **Telegram Bot API**. Ваш backend на Render принимает **webhook** (`POST /api/telegram/webhook`), обрабатывает `/start <TOKEN>` и шлёт код через `sendMessage`.

### Шаг 1 — переменные окружения backend на Render

В сервисе **meeting-room-backend** → **Environment** добавьте (значения из [@BotFather](https://t.me/BotFather)):

| Переменная | Пример | Замечание |
|------------|--------|-----------|
| `TELEGRAM_BOT_TOKEN` | `123456789:AAH...` | Секрет, не коммитить в git |
| `TELEGRAM_BOT_USERNAME` | `MyMeetingBot` | **Без** `@`, как в ссылке `t.me/MyMeetingBot` |

После изменения env сделайте **Manual Deploy** / перезапуск сервиса.

### Шаг 2 — зарегистрировать webhook на URL Render (обязательно)

Telegram шлёт обновления **только** на тот URL, который указан в `setWebhook`. После переезда с Railway старый URL даёт 404 — код не придёт.

Подставьте **ваш** публичный HTTPS URL backend (из Render → сервис → URL), путь фиксированный:

```text
https://<ВАШ-BACKEND-НА-RENDER>.onrender.com/api/telegram/webhook
```

Установка webhook (в браузере или curl, подставьте токен бота):

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<ВАШ-BACKEND>.onrender.com/api/telegram/webhook
```

Проверка:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

Ожидаемо в ответе:

- `result.url` — именно ваш Render backend, **не** старый Railway.
- `last_error_message` пустой или отсутствует после успешных запросов.

Проверка доступности endpoint (должен вернуть JSON, не 404):

```text
https://<ВАШ-BACKEND>.onrender.com/api/telegram/webhook
```

(для `GET` в коде есть заглушка для проверки, что URL живой и HTTPS ок.)

### Шаг 3 — как пользоваться с сайта

1. Регистрация на фронте → backend отдаёт ссылку вида `https://t.me/<бот>?start=<TOKEN>`.
2. Открыть **именно эту ссылку**, в боте нажать **Start** (если открыть бота через поиск и нажать `/start` без токена — код не отправится).
3. Backend по webhook находит `TelegramPendingLink` по токену, сохраняет `chat_id`, отправляет код из `email_verification_codes` (название историческое; код уходит в Telegram).

### Типичные проблемы

| Симптом | Что проверить |
|---------|----------------|
| Регистрация 503 | Не заданы `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` |
| Start нажат, кода нет | `getWebhookInfo`: URL всё ещё Railway или другой хост; исправить `setWebhook` |
| Долгая задержка первого ответа | Free web service на Render «засыпает»; первый запрос может поднимать инстанс — подождите и повторите |
| Токен в ссылке истёк | Зарегистрируйтесь снова и откройте **новую** ссылку (TTL задаётся `EMAIL_VERIFICATION_CODE_EXPIRE_MINUTES`) |

### Секреты в Blueprint

Токен бота **не** добавляйте в `render.yaml` в репозиторий. Задавайте `TELEGRAM_BOT_TOKEN` и `TELEGRAM_BOT_USERNAME` только в панели Render (Environment) или в секретах провайдера.

## 8) Telegram ник или номер в auth

Реализован сценарий, где пользователь может указывать при регистрации и входе:

- `@username` Telegram
- номер телефона, привязанный к Telegram (например `+79991234567`)

Это работает в следующих потоках:

- регистрация
- вход (`login-request`, `login-verify`)
- забыли пароль / сброс пароля

### Как проверяет бот

- Если у пользователя указан `@username`, после `Start` бот проверяет, что username Telegram совпадает с тем, что указан при регистрации.
- Если у пользователя указан номер, бот просит отправить **контакт** в Telegram и сверяет номер с указанным при регистрации.
- После успешной проверки отправляется 6-значный код.

### Нужны ли миграции?

Для текущей реализации — **нет**.

Почему:

- использованы уже существующие поля таблицы `users`:
  - `telegram_username`
  - `phone`
  - `telegram_chat_id`
- структура БД не менялась, менялась только логика backend/frontend.

Когда миграция понадобится:

- если захотите хранить Telegram-номер отдельно от профиля (например, в новом поле `telegram_phone`), чтобы не использовать `phone` для Telegram-идентификатора.
