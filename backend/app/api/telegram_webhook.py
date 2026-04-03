"""
Webhook для Telegram Bot: при /start TOKEN привязываем chat_id к пользователю и отправляем код.
"""
import logging
import re
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
PHONE_RE = re.compile(r"[^\d+]")


def _normalize_phone(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""
    has_plus = raw.startswith("+")
    digits = "".join(ch for ch in raw if ch.isdigit())
    if not digits:
        return ""
    if not has_plus:
        if len(digits) == 11 and digits.startswith("8"):
            digits = "7" + digits[1:]
        return f"+{digits}"
    return f"+{digits}"


@router.get("/telegram/webhook")
async def telegram_webhook_health() -> dict:
    """Проверка доступности URL для setWebhook (Telegram требует HTTPS и 200)."""
    return {"ok": True, "message": "Set webhook: POST to this URL from Telegram. Use setWebhook with url=https://YOUR_DOMAIN/api/telegram/webhook"}


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

    update_id = body.get("update_id")
    logger.info("Telegram webhook received update_id=%s", update_id)

    message = body.get("message") or body.get("edited_message")
    if not message:
        logger.info("Telegram webhook: no message in update")
        return {"ok": True}

    chat = message.get("chat") or {}
    chat_id = chat.get("id")
    contact = message.get("contact") or {}
    from_user = message.get("from") or {}

    # Phone-based verification flow: user can send contact after /start.
    if chat_id is not None and contact:
        user = db.execute(select(User).where(User.telegram_chat_id == chat_id)).scalar_one_or_none()
        if user and user.phone:
            expected_phone = _normalize_phone(user.phone)
            incoming_phone = _normalize_phone(contact.get("phone_number") or "")
            if expected_phone and incoming_phone == expected_phone:
                verification = db.execute(
                    select(EmailVerificationCode).where(EmailVerificationCode.user_id == user.id)
                ).scalar_one_or_none()
                now = datetime.now(timezone.utc)
                if verification and verification.expires_at > now:
                    settings = get_settings()
                    send_verification_code(
                        chat_id,
                        verification.code,
                        settings.email_verification_code_expire_minutes,
                    )
                else:
                    send_message(
                        chat_id,
                        "⏱ Код подтверждения истёк или уже использован. Зарегистрируйтесь заново на сайте.",
                    )
                return {"ok": True}
            send_message(chat_id, "Номер не совпадает с указанным при регистрации.")
            return {"ok": True}

    text = (message.get("text") or "").strip()
    if not text.startswith("/start"):
        logger.info("Telegram webhook: text does not start with /start, text_len=%s", len(text))
        return {"ok": True}

    # /start TOKEN — Telegram: только A-Za-z0-9_-, до 64 символов. Мы используем token_urlsafe(32) ~43 символа.
    parts = text.split(maxsplit=1)
    token = (parts[1].strip() if len(parts) > 1 else None) or ""
    if not token:
        logger.warning(
            "Telegram /start without token — откройте именно ссылку со страницы после регистрации (с кнопкой «Открыть бота»), а не поиск бота по имени."
        )
        return {"ok": True}

    # Убираем возможные лишние символы (пробелы, переносы)
    token = token.strip()
    logger.info("Telegram /start token_len=%s token_prefix=%r", len(token), token[:20] if len(token) >= 20 else token)

    if chat_id is None:
        logger.warning("Telegram webhook: no chat_id in message")
        return {"ok": True}

    telegram_username = from_user.get("username")
    if telegram_username:
        telegram_username = telegram_username.lower()

    # Найти ссылку по токену (точное совпадение)
    link = db.execute(select(TelegramPendingLink).where(TelegramPendingLink.token == token)).scalar_one_or_none()
    if not link:
        # Telegram обрезает start-параметр до 64 символов — наш токен ~43, ок.
        from sqlalchemy import func
        count = db.execute(select(func.count()).select_from(TelegramPendingLink)).scalar() or 0
        logger.warning(
            "Telegram start: token не найден в БД. token_len=%s token_prefix=%r total_links_in_db=%s",
            len(token),
            token[:24] if len(token) >= 24 else token,
            count,
        )
        return {"ok": True}

    logger.info("Telegram: link found user_id=%s", link.user_id)
    user = db.execute(select(User).where(User.id == link.user_id)).scalar_one_or_none()
    if not user:
        logger.warning("Telegram: user not found for link user_id=%s", link.user_id)
        return {"ok": True}

    # Привязка Telegram к пользователю
    user.telegram_chat_id = chat_id
    if user.telegram_username:
        if not telegram_username or telegram_username != user.telegram_username:
            send_message(
                chat_id,
                "Этот Telegram-аккаунт не совпадает с указанным при регистрации. Используйте корректный @username.",
            )
            db.commit()
            return {"ok": True}
    elif telegram_username:
        user.telegram_username = telegram_username
    db.add(user)

    # Код подтверждения — отдельным запросом
    verification = db.execute(
        select(EmailVerificationCode).where(EmailVerificationCode.user_id == user.id)
    ).scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if verification and verification.expires_at > now:
        # For phone-based accounts require contact sharing to verify number.
        if user.phone and not user.telegram_username:
            send_message(
                chat_id,
                "Для подтверждения номера отправьте контакт в Telegram (Скрепка -> Контакт -> Отправить мой номер).",
            )
            db.commit()
            return {"ok": True}
        settings = get_settings()
        logger.info(
            "Telegram: sending code to chat_id=%s user_id=%s expire_min=%s",
            chat_id,
            user.id,
            settings.email_verification_code_expire_minutes,
        )
        ok = send_verification_code(
            chat_id,
            verification.code,
            settings.email_verification_code_expire_minutes,
        )
        if ok:
            logger.info("Telegram: verification code sent successfully user_id=%s chat_id=%s", user.id, chat_id)
        else:
            logger.warning(
                "Telegram: send_verification_code returned False user_id=%s chat_id=%s (проверьте TELEGRAM_BOT_TOKEN и логи sendMessage)",
                user.id,
                chat_id,
            )
    else:
        if verification:
            logger.info("Telegram: verification code expired user_id=%s expires_at=%s", user.id, verification.expires_at)
        else:
            logger.info("Telegram: no verification code for user_id=%s", user.id)
        send_message(
            chat_id,
            "⏱ Код подтверждения истёк или уже использован. Зарегистрируйтесь заново на сайте и откройте новую ссылку.",
        )

    db.commit()
    return {"ok": True}
