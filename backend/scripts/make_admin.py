#!/usr/bin/env python3
"""
Назначить пользователя админом по email.
Запуск из корня backend: python scripts/make_admin.py user@example.com
"""
import sys
import os

# Добавляем корень backend в путь
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database import SessionLocal
from app.models.user import User


def main() -> None:
    if len(sys.argv) < 2:
        print("Использование: python scripts/make_admin.py <email>")
        sys.exit(1)
    email = sys.argv[1].strip().lower()
    db = SessionLocal()
    try:
        user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if not user:
            print(f"Пользователь с email {email} не найден.")
            sys.exit(1)
        if user.is_admin:
            print(f"Пользователь {email} уже является админом.")
            return
        user.is_admin = True
        user.is_verified = True
        db.commit()
        print(f"Пользователь {email} назначен админом.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
