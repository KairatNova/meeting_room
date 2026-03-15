"""
Webhook для Telegram Bot: при /start TOKEN привязываем chat_id к пользователю и отправляем код.
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from sqlalchemy import select

from app.core.dependencies import DbSession
from app.models.user import User
from app.models.telegram_pending_link import TelegramPendingLink
from app.models.email_verification import EmailVerificationCode
from app.config import get_settings
from app.services.telegram import send_verification_code, send_message

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

    # /start TOKEN — токен может содержать - и _ (token_urlsafe)
    parts = text.split(maxsplit=1)
    token = (parts[1].strip() if len(parts) > 1 else None) or ""
    if not token:
        logger.info("Telegram /start without token")
        return {"ok": True}

    chat_id = message.get("chat", {}).get("id")
    if chat_id is None:
        return {"ok": True}

    from_user = message.get("from") or {}
    telegram_username = from_user.get("username")
    if telegram_username:
        telegram_username = telegram_username.lower()

    # Найти ссылку по токену (точное совпадение)
    link = db.execute(select(TelegramPendingLink).where(TelegramPendingLink.token == token)).scalar_one_or_none()
    if not link:
        logger.info("Telegram start: unknown or expired token, prefix=%s", token[:12] if len(token) >= 12 else token)
        return {"ok": True}

    user = db.execute(select(User).where(User.id == link.user_id)).scalar_one_or_none()
    if not user:
        return {"ok": True}

    # Привязка Telegram к пользователю
    user.telegram_chat_id = chat_id
    if telegram_username:
        user.telegram_username = telegram_username
    db.add(user)

    # Код подтверждения — отдельным запросом, чтобы точно получить актуальную запись
    verification = db.execute(
        select(EmailVerificationCode)
        .where(EmailVerificationCode.user_id == user.id)
    ).scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if verification and verification.expires_at > now:
        settings = get_settings()
        ok = send_verification_code(
            chat_id,
            verification.code,
            settings.email_verification_code_expire_minutes,
        )
        if ok:
            logger.info("Sent verification code to Telegram for user_id=%s chat_id=%s", user.id, chat_id)
        else:
            logger.warning("Failed to send verification code to Telegram for user_id=%s", user.id)
    else:
        if verification:
            logger.info("Verification code expired for user_id=%s, not sending", user.id)
        else:
            logger.info("No verification code for user_id=%s (already verified?)", user.id)
        send_message(
            chat_id,
            "⏱ Код подтверждения истёк или уже использован. Зарегистрируйтесь заново на сайте и откройте новую ссылку.",
        )

    db.commit()
    return {"ok": True}
