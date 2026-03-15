"""
Отправка сообщений в Telegram через Bot API.
Используется для кодов верификации и сброса пароля.
Отправлять можно только пользователям, которые уже начали диалог с ботом (есть chat_id).
"""
import logging
import secrets

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

BASE_URL = "https://api.telegram.org/bot{token}"


def _url(method: str) -> str:
    settings = get_settings()
    return BASE_URL.format(token=settings.telegram_bot_token) + "/" + method


def send_message(chat_id: int, text: str) -> bool:
    """
    Отправить сообщение в чат. Возвращает True при успехе.
    При отсутствии токена или ошибке API возвращает False и пишет в лог.
    """
    settings = get_settings()
    if not settings.telegram_bot_token:
        logger.warning("Telegram bot token not set, skip sending message")
        return False
    try:
        r = httpx.post(
            _url("sendMessage"),
            json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"},
            timeout=10.0,
        )
        if r.status_code != 200:
            logger.warning(
                "Telegram sendMessage error: status=%s body=%s chat_id=%s",
                r.status_code,
                r.text[:500] if r.text else "",
                chat_id,
            )
            return False
        return True
    except Exception as e:
        logger.exception("Telegram sendMessage exception chat_id=%s: %s", chat_id, e)
        return False


def send_verification_code(chat_id: int, code: str, expire_minutes: int) -> bool:
    """Отправить код подтверждения в Telegram."""
    text = (
        f"🔐 <b>Код подтверждения</b>\n\n"
        f"Ваш код: <code>{code}</code>\n\n"
        f"Код действителен {expire_minutes} мин."
    )
    return send_message(chat_id, text)


def send_password_reset_code(chat_id: int, code: str, expire_minutes: int) -> bool:
    """Отправить код сброса пароля в Telegram."""
    text = (
        f"🔑 <b>Сброс пароля</b>\n\n"
        f"Код для сброса: <code>{code}</code>\n\n"
        f"Код действителен {expire_minutes} мин."
    )
    return send_message(chat_id, text)


def generate_link_token() -> str:
    """Одноразовый токен для ссылки t.me/bot?start=TOKEN (безопасный, URL-safe)."""
    return secrets.token_urlsafe(32)


def get_telegram_link(token: str) -> str | None:
    """
    Собрать ссылку для привязки Telegram. Если имя бота не задано — возвращаем None.
    """
    settings = get_settings()
    if not settings.telegram_bot_username or not settings.telegram_bot_token:
        return None
    return f"https://t.me/{settings.telegram_bot_username.strip().lstrip('@')}?start={token}"
