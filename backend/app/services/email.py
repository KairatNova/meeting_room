"""
Отправка email через SMTP (например Gmail).
Используется для отправки кода подтверждения при регистрации.
"""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import get_settings


def send_verification_email(to_email: str, code: str) -> None:
    """
    Отправить письмо с кодом подтверждения на to_email.
    Raises: smtplib.SMTPException при ошибке отправки.
    """
    settings = get_settings()
    if not settings.smtp_user or not settings.smtp_password:
        # В режиме разработки без SMTP — логируем в консоль
        print(f"[DEV] Verification code for {to_email}: {code}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Код подтверждения email — Meeting Rooms"
    msg["From"] = settings.smtp_from_email
    msg["To"] = to_email

    text = f"Ваш код подтверждения: {code}\n\nКод действителен {settings.email_verification_code_expire_minutes} минут."
    html = f"""
    <p>Ваш код подтверждения: <strong>{code}</strong></p>
    <p>Код действителен {settings.email_verification_code_expire_minutes} минут.</p>
    """
    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from_email, to_email, msg.as_string())
