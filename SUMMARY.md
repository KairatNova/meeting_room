# Итог проекта: бронирование переговорных комнат

## Что сделано

### Backend (FastAPI + PostgreSQL)

| Функция | Статус |
|--------|--------|
| Модели и миграции | ✅ User, Room, Booking, EmailVerificationCode; Alembic |
| Регистрация | ✅ С подтверждением email (6-значный код, SMTP), пароль хэшируется |
| Подтверждение email | ✅ POST /api/auth/verify-email, код с TTL 10 мин, удаление после использования |
| Логин / JWT | ✅ POST /api/auth/login только для is_verified; access_token |
| Профиль | ✅ GET/PATCH /api/auth/me, /users/me |
| Роль админа | ✅ require_admin, GET /api/admin/me |
| Комнаты | ✅ GET list (фильтры capacity_min, search), GET by id, POST/PATCH/DELETE (админ) |
| Бронирования | ✅ Сервис проверки конфликтов; GET list (room_id, from_time, to_time), POST (409 при конфликте), GET /me, DELETE (отмена) |
| Swagger | ✅ /docs, /redoc, /openapi.json |

### Frontend (React + Vite + Tailwind)

| Функция | Статус |
|--------|--------|
| Регистрация → верификация → логин | ✅ Страницы register, verify-email, login |
| Шапка и меню | ✅ Имя пользователя, выпадающее меню (Мои данные, Мои бронирования, Выйти) |
| Профиль | ✅ Страница с email, именем и формой редактирования |
| Список комнат | ✅ Фильтры, карточки, ссылки на детальную |
| Детальная комната | ✅ Календарь (FullCalendar), форма брони, обработка 409 |
| Мои бронирования | ✅ Список, отмена |
| Админ-панель | ✅ CRUD комнат: форма добавления/редактирования, таблица, удаление с подтверждением |
| Защита роутов | ✅ PrivateRoute, AdminRoute |

---

## Что осталось (по желанию)

- Показ названия комнаты на странице «Мои бронирования» (сейчас только room_id) — можно расширить API или подгружать комнаты отдельно.
- Ограничение длины брони (например макс. 4 часа) — валидация на бэкенде.
- Повторная отправка кода верификации (resend code) — отдельный эндпоинт.
- Unit-тесты на проверку конфликтов и API (pytest).

---

## Как выгрузить на GitHub

**Один репозиторий (рекомендуется):** backend и frontend в одном репо в папках `backend/` и `frontend/`.

1. В корне проекта (meeting_room) создайте `.gitignore` (см. ниже).
2. Убедитесь, что в репо **не** попадают: `backend/.env`, `backend/.venv/`, `frontend/node_modules/`, `frontend/dist/`.
3. Инициализация и первый пуш:
   ```bash
   cd /Users/m1/Documents/meeting_room
   git init
   git add .
   git commit -m "Initial: meeting rooms app (backend + frontend)"
   git remote add origin https://github.com/USERNAME/meeting_room.git
   git push -u origin main
   ```
4. **Пушить отдельно фронт и бэк не нужно** — один репозиторий, один push. При необходимости можно настроить GitHub Actions для сборки фронта и деплоя (отдельная тема).

---

## Как добавить админа

В БД у пользователя есть поле `is_admin`. Админом делают того, у кого `is_admin = true`.

**Способ 1 — SQL (после регистрации пользователя):**

```sql
UPDATE users SET is_verified = true, is_admin = true WHERE email = 'admin@example.com';
```

**Способ 2 — скрипт в репозитории:** см. `backend/scripts/make_admin.py` (создан ниже). Запуск из папки backend:

```bash
cd backend
python scripts/make_admin.py admin@example.com
```

После этого пользователь с этим email при входе получает доступ к разделу «Админ» и CRUD комнат.
