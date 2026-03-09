# Frontend: Бронирование переговорных

React 18 + TypeScript + Vite + Tailwind CSS.

## Установка и запуск

```bash
cd frontend
npm install
npm run dev
```

Откройте http://localhost:5173. Прокси к API: запросы к `/api` уходят на backend (порт 8000).

## Сборка

```bash
npm run build
npm run preview   # просмотр production-сборки
```

## Структура

- `src/main.tsx` — точка входа, Router + AuthProvider
- `src/App.tsx` — маршруты и защищённые роуты (PrivateRoute, AdminRoute)
- `src/api/` — client (fetch + JWT), auth, rooms, bookings
- `src/context/AuthContext.tsx` — пользователь, login/logout/register
- `src/components/Layout.tsx` — шапка, навигация
- `src/pages/` — страницы (Home, Login, Register, RoomList, RoomDetail, MyBookings, Admin)
- `src/types/api.ts` — типы, совпадающие с API
- `src/hooks/` — useAsync и др.
