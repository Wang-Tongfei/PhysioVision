"""Transactional email delivery using standard SMTP."""
import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_password_reset(recipient: str, reset_url: str) -> bool:
    if not settings.SMTP_HOST:
        logger.warning("SMTP is not configured. Development reset link: %s", reset_url)
        return False

    message = EmailMessage()
    message["Subject"] = "Reset your PhysioVision password"
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = recipient
    message.set_content(
        "A password reset was requested for your PhysioVision account.\n\n"
        f"Reset your password: {reset_url}\n\n"
        "This link expires in 30 minutes. If you did not request it, ignore this email."
    )
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
        if settings.SMTP_USE_TLS:
            smtp.starttls()
        if settings.SMTP_USERNAME:
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        smtp.send_message(message)
    return True
