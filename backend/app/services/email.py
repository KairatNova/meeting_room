"""
Отправка email через SMTP (например Gmail).
Используется для отправки кода подтверждения при регистрации.
"""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import get_settings


def _send_email(to_email: str, subject: str, text: str, html: str) -> None:
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

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from_email, to_email, msg.as_string())


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
    _send_email(to_email, subject, text, html)


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
    _send_email(to_email, subject, text, html)
