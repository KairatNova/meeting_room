"""
Alembic env: подключение к БД и метаданные моделей для автогенерации миграций.
Запуск: из корня backend/ — alembic revision --autogenerate -m "description"
        alembic upgrade head
"""
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import op

# Импорт всех моделей, чтобы Base.metadata содержал таблицы
from app.database import Base
from app.models import User, Room, Booking, EmailVerificationCode, RoomPhoto, RoomReview  # noqa: F401
from app.config import get_settings

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# URL из настроек приложения (не из alembic.ini)
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Миграции в offline-режиме: только генерируем SQL, не подключаясь к БД."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Миграции в online-режиме: подключаемся к БД и применяем миграции."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
