# Deploy to Railway (Backend + Frontend)

This project is a monorepo with two apps:
- `backend/` — FastAPI API
- `frontend/` — React (Vite)

Create **two Railway services** from the same GitHub repository.

## 1) Backend service

1. In Railway, create a new service from GitHub repo.
2. Set **Root Directory** to `backend`.
3. Railway will use `backend/railway.json`.
4. Add environment variables:
   - `DATABASE_URL` = PostgreSQL connection string (Railway Postgres plugin)
   - `SECRET_KEY` = strong random secret (32+ chars)
   - `DEBUG` = `false`
   - `CORS_ORIGINS` = frontend URL, e.g. `https://your-frontend.up.railway.app`
   - Optional SMTP:
     - `SMTP_HOST`
     - `SMTP_PORT`
     - `SMTP_USER`
     - `SMTP_PASSWORD`
     - `SMTP_FROM_EMAIL`
5. Deploy.
6. Verify:
   - `https://<backend-url>/health`
   - `https://<backend-url>/docs`

## 2) Frontend service

1. Create second Railway service from the same repo.
2. Set **Root Directory** to `frontend`.
3. Railway will use `frontend/railway.json`.
4. Add environment variable:
   - `VITE_API_URL` = backend URL, e.g. `https://your-backend.up.railway.app`
5. Deploy.
6. Open frontend URL and verify:
   - Home page loads
   - API requests work
   - Login/registration works

## 3) Final checklist

- Backend migrations ran (`alembic upgrade head` in start command)
- Backend CORS includes frontend domain
- Frontend has correct `VITE_API_URL`
- Uploads and booking flow work in production
- `/docs` is public and usable

## Notes

- Local development still works without `VITE_API_URL` because dev proxy is configured in `frontend/vite.config.ts`.
- In production, frontend must know backend URL via `VITE_API_URL`.

