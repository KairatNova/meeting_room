"""
Подключение к PostgreSQL и фабрика сессий SQLAlchemy 2.0.
Одна сессия на запрос, автоматическое закрытие после ответа.
"""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker, declarative_base

from app.config import get_settings

settings = get_settings()

# Движок с пулом соединений
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,  # проверка соединения перед выдачей из пула
    echo=settings.debug,  # SQL в консоль только в debug
)

# Фабрика сессий: одна сессия = один запрос
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Базовый класс для моделей (SQLAlchemy 2.0 style)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency: выдаёт сессию БД на время обработки запроса.
    После ответа сессия закрывается.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
