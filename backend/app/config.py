"""
Конфигурация приложения через переменные окружения.
Используем pydantic-settings для валидации и загрузки из .env.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Настройки приложения. Значения по умолчанию для локальной разработки."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # --- App ---
    app_name: str = "Meeting Rooms API"
    debug: bool = False

    # --- Database ---
    database_url: str = "postgresql://postgres:1234@localhost:5433/meeting_rooms"

    # --- JWT ---
    secret_key: str = "change-me-in-production-use-env"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 часа

    # --- CORS --- (в .env строка через запятую: http://localhost:5173,http://127.0.0.1:5173)
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    def get_cors_origins_list(self) -> List[str]:
        """Список разрешённых origins для CORS."""
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]

    # --- Email (SMTP) для кодов подтверждения ---
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "noreply@example.com"
    smtp_timeout_seconds: int = 20
    # Провайдер отправки email: auto | smtp | resend
    email_provider: str = "auto"
    # Resend API (https://resend.com)
    resend_api_key: str = ""
    resend_from_email: str = "Meeting Rooms <onboarding@resend.dev>"
    # Если SMTP недоступен (например в облаке), не ронять регистрацию:
    # код подтверждения будет выведен в логи сервера.
    email_fail_open: bool = True
    # Время жизни кода подтверждения (минуты)
    email_verification_code_expire_minutes: int = 10

    # --- Загрузка файлов (фото комнат) ---
    upload_dir: str = "uploads"  # папка относительно корня проекта (backend/)


@lru_cache
def get_settings() -> Settings:
    """Кэшированный экземпляр настроек (один на процесс)."""
    return Settings()
