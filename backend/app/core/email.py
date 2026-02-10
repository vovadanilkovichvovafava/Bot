import smtplib
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from app.config import settings


def generate_verification_code(length: int = 6) -> str:
    """Generate a random numeric verification code"""
    return ''.join(random.choices(string.digits, k=length))


def get_verification_expiry() -> datetime:
    """Get expiry time for verification code (15 minutes from now)"""
    return datetime.utcnow() + timedelta(minutes=15)


async def send_verification_email(email: str, code: str) -> bool:
    """Send verification code email"""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        # SMTP not configured, log and return success for development
        print(f"[DEV] Verification code for {email}: {code}")
        return True

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'Your verification code: {code}'
        msg['From'] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL or settings.SMTP_USER}>"
        msg['To'] = email

        # Plain text version
        text = f"""
Your verification code is: {code}

This code will expire in 15 minutes.

If you didn't request this code, please ignore this email.
"""

        # HTML version
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }}
        .container {{ max-width: 400px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
        .code {{ font-size: 32px; font-weight: bold; color: #6366f1; text-align: center; letter-spacing: 8px; padding: 20px; background: #f5f5ff; border-radius: 12px; margin: 20px 0; }}
        .footer {{ color: #888; font-size: 12px; text-align: center; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <h2 style="text-align: center; color: #333;">Verify Your Email</h2>
        <p style="color: #666; text-align: center;">Enter this code to complete your registration:</p>
        <div class="code">{code}</div>
        <p style="color: #888; text-align: center; font-size: 14px;">This code expires in 15 minutes</p>
        <div class="footer">
            If you didn't request this code, please ignore this email.
        </div>
    </div>
</body>
</html>
"""

        msg.attach(MIMEText(text, 'plain'))
        msg.attach(MIMEText(html, 'html'))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)

        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False
