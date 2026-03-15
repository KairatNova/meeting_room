"""
Отправка email через SMTP (например Gmail).
Используется для отправки кода подтверждения при регистрации.
"""
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


def _send_email_smtp(to_email: str, subject: str, text: str, html: str) -> None:
    """Внутренняя утилита отправки email через SMTP."""
    settings = get_settings()
    if not settings.smtp_user or not settings.smtp_password:
        # В режиме разработки без SMTP — логируем в консоль
        print(f"[DEV EMAIL] To: {to_email}\nSubject: {subject}\n{text}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from_email
    msg["To"] = to_email

    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(
        settings.smtp_host,
        settings.smtp_port,
        timeout=settings.smtp_timeout_seconds,
    ) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from_email, to_email, msg.as_string())


def _send_email_resend(to_email: str, subject: str, text: str, html: str) -> None:
    """Отправка email через Resend HTTP API."""
    settings = get_settings()
    if not settings.resend_api_key:
        raise RuntimeError("RESEND_API_KEY is empty")

    payload = {
        "from": settings.resend_from_email,
        "to": [to_email],
        "subject": subject,
        "text": text,
        "html": html,
    }
    headers = {
        "Authorization": f"Bearer {settings.resend_api_key}",
        "Content-Type": "application/json",
    }
    with httpx.Client(timeout=settings.smtp_timeout_seconds) as client:
        response = client.post("https://api.resend.com/emails", json=payload, headers=headers)
        response.raise_for_status()


def _send_email(to_email: str, subject: str, text: str, html: str) -> None:
    """Унифицированная отправка email через выбранного провайдера."""
    settings = get_settings()
    provider = (settings.email_provider or "auto").strip().lower()
    if provider not in {"auto", "smtp", "resend"}:
        raise ValueError("EMAIL_PROVIDER must be one of: auto, smtp, resend")

    if provider == "resend":
        _send_email_resend(to_email, subject, text, html)
        return
    if provider == "smtp":
        _send_email_smtp(to_email, subject, text, html)
        return

    # auto: prefer Resend if key exists, otherwise fallback to SMTP/dev log mode.
    if settings.resend_api_key:
        _send_email_resend(to_email, subject, text, html)
    else:
        _send_email_smtp(to_email, subject, text, html)


def send_verification_email(to_email: str, code: str) -> None:
    """
    Отправить письмо с кодом подтверждения на to_email.
    Raises: smtplib.SMTPException при ошибке отправки.
    """
    settings = get_settings()
    subject = "Код подтверждения email — Meeting Rooms"
    text = (
        f"Ваш код подтверждения: {code}\n\n"
        f"Код действителен {settings.email_verification_code_expire_minutes} минут."
    )
    html = f"""
    <p>Ваш код подтверждения: <strong>{code}</strong></p>
    <p>Код действителен {settings.email_verification_code_expire_minutes} минут.</p>
    """
    try:
        _send_email(to_email, subject, text, html)
    except Exception:
        logger.exception("SMTP error while sending verification email to %s", to_email)
        raise


def send_password_reset_email(to_email: str, code: str) -> None:
    """Отправить письмо с кодом для сброса пароля."""
    settings = get_settings()
    subject = "Сброс пароля — Meeting Rooms"
    text = (
        f"Вы запросили сброс пароля.\n"
        f"Ваш код для сброса пароля: {code}\n\n"
        f"Код действителен {settings.email_verification_code_expire_minutes} минут."
    )
    html = f"""
    <p>Вы запросили сброс пароля.</p>
    <p>Ваш код для сброса пароля: <strong>{code}</strong></p>
    <p>Код действителен {settings.email_verification_code_expire_minutes} минут.</p>
    """
    try:
        _send_email(to_email, subject, text, html)
    except Exception:
        logger.exception("SMTP error while sending password reset email to %s", to_email)
        raise
