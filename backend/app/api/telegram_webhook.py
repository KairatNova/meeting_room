"""
Webhook для Telegram Bot: при /start TOKEN привязываем chat_id к пользователю и отправляем код.
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Request, Depends
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.dependencies import DbSession
from app.models.user import User
from app.models.telegram_pending_link import TelegramPendingLink
from app.models.email_verification import EmailVerificationCode
from app.config import get_settings
from app.services.telegram import send_verification_code

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/telegram/webhook")
async def telegram_webhook(request: Request, db: DbSession) -> dict:
    """
    Принимает Update от Telegram. При /start TOKEN:
    - находит TelegramPendingLink по token;
    - привязывает chat_id и username к пользователю;
    - отправляет код подтверждения в Telegram (если есть незавершённая верификация).
    """
    try:
        body = await request.json()
    except Exception as e:
        logger.warning("Telegram webhook invalid JSON: %s", e)
        return {"ok": True}

    message = body.get("message") or body.get("edited_message")
    if not message:
        return {"ok": True}

    text = (message.get("text") or "").strip()
    if not text.startswith("/start"):
        return {"ok": True}

    parts = text.split(maxsplit=1)
    token = parts[1] if len(parts) > 1 else None
    if not token:
        return {"ok": True}

    chat_id = message.get("chat", {}).get("id")
    if chat_id is None:
        return {"ok": True}

    from_user = message.get("from") or {}
    telegram_username = from_user.get("username")
    if telegram_username:
        telegram_username = telegram_username.lower()

    stmt = (
        select(TelegramPendingLink)
        .where(TelegramPendingLink.token == token)
        .options(selectinload(TelegramPendingLink.user).selectinload(User.email_verification_code))
    )
    link = db.execute(stmt).scalar_one_or_none()
    if not link:
        logger.info("Telegram start with unknown token: %s", token[:8])
        return {"ok": True}

    user = link.user
    if not user:
        return {"ok": True}

    # Привязка Telegram к пользователю
    user.telegram_chat_id = chat_id
    if telegram_username:
        user.telegram_username = telegram_username

    # Отправить код подтверждения в Telegram, если он ещё действует
    verification = user.email_verification_code
    if verification and verification.expires_at > datetime.now(timezone.utc):
        settings = get_settings()
        send_verification_code(
            chat_id,
            verification.code,
            settings.email_verification_code_expire_minutes,
        )
        logger.info("Sent verification code to Telegram for user_id=%s", user.id)

    db.add(user)
    db.commit()
    return {"ok": True}
