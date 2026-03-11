"""
Точка входа FastAPI: приложение, CORS, подключение роутеров API.
"""
from pathlib import Path
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.api import auth, rooms, bookings, admin


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Жизненный цикл приложения: код при старте и при остановке."""
    settings = get_settings()
    upload_root = Path(__file__).resolve().parent.parent / settings.upload_dir
    upload_root.mkdir(parents=True, exist_ok=True)
    yield
    # Shutdown: закрыть соединения и т.д.


def create_app() -> FastAPI:
    """Фабрика приложения — удобно для тестов и явной инициализации."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        description="API для бронирования переговорных комнат",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # CORS: разрешаем запросы с фронтенда (Vite по умолчанию на 5173)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get_cors_origins_list(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Подключение роутеров (префикс /api для единообразия)
    app.include_router(auth.router, prefix="/api", tags=["Auth"])
    app.include_router(rooms.router, prefix="/api/rooms", tags=["Rooms"])
    app.include_router(bookings.router, prefix="/api/bookings", tags=["Bookings"])
    app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

    upload_root = Path(__file__).resolve().parent.parent / settings.upload_dir
    upload_root.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(upload_root)), name="uploads")

    @app.get("/health", tags=["Health"])
    def health() -> dict[str, str]:
        """Проверка доступности сервиса (для мониторинга и деплоя)."""
        return {"status": "ok"}

    return app


app = create_app()
