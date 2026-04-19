"""
auth.py  –  JWT + password hashing + SMTP email notifications
"""
import os
import smtplib
import hashlib
import secrets
import json
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# ── Simple JWT-like token (base64 signed, no external deps) ───────────────────
SECRET_KEY = os.getenv("AUTH_SECRET", "super-secret-spam-ai-key-change-in-prod")
TOKEN_EXPIRE_HOURS = 72

def _b64(s: str) -> str:
    import base64
    return base64.urlsafe_b64encode(s.encode()).decode()

def _sign(payload: str) -> str:
    import hmac, base64
    sig = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(sig).decode()

def create_token(user_id: int, email: str) -> str:
    payload = json.dumps({
        "user_id": user_id,
        "email": email,
        "exp": (datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)).isoformat()
    })
    body = _b64(payload)
    sig  = _sign(body)
    return f"{body}.{sig}"

def verify_token(token: str) -> dict | None:
    try:
        body, sig = token.rsplit(".", 1)
        if sig != _sign(body):
            return None
        import base64
        payload = json.loads(base64.urlsafe_b64decode(body + "==").decode())
        if datetime.fromisoformat(payload["exp"]) < datetime.utcnow():
            return None
        return payload
    except Exception:
        return None

# ── Password hashing ──────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260_000)
    return f"{salt}:{hashed.hex()}"

def verify_password(password: str, stored: str) -> bool:
    try:
        salt, hashed_hex = stored.split(":", 1)
        check = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260_000)
        return check.hex() == hashed_hex
    except Exception:
        return False

# ── SMTP email sender ─────────────────────────────────────────────────────────
SMTP_HOST     = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER", "")      # set in .env
SMTP_PASS     = os.getenv("SMTP_PASS", "")      # Gmail app password
SMTP_FROM     = os.getenv("SMTP_FROM", SMTP_USER)

def _send_email(to: str, subject: str, html_body: str):
    """Fire-and-forget SMTP send. Silently skips if SMTP not configured."""
    if not SMTP_USER or not SMTP_PASS:
        print(f"[SMTP] Not configured – skipping email to {to}")
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"Smart Spam AI <{SMTP_FROM}>"
        msg["To"]      = to
        msg.attach(MIMEText(html_body, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, to, msg.as_string())
        print(f"[SMTP] Email sent → {to}")
    except Exception as e:
        print(f"[SMTP] Failed to send to {to}: {e}")


def send_welcome_email(to: str, name: str):
    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#04040a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;">
    <tr><td style="background:linear-gradient(135deg,#7c3aed,#0ea5e9);border-radius:16px 16px 0 0;padding:36px;text-align:center;">
      <div style="font-size:32px;margin-bottom:8px;">🛡️</div>
      <h1 style="color:#fff;margin:0;font-size:24px;letter-spacing:-0.5px;">Welcome to Smart Spam AI</h1>
      <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;">Your AI-powered email guardian is ready.</p>
    </td></tr>
    <tr><td style="background:#080815;border:1px solid rgba(255,255,255,0.07);border-top:none;border-radius:0 0 16px 16px;padding:36px;">
      <p style="color:#94a3b8;font-size:16px;line-height:1.6;">Hi <strong style="color:#f1f5f9;">{name}</strong>,</p>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;">
        Your account has been <strong style="color:#10b981;">successfully created</strong>. 
        You now have access to our full suite of AI-powered spam detection tools.
      </p>
      <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.25);border-radius:12px;padding:20px;margin:24px 0;">
        <p style="color:#a855f7;font-weight:700;margin:0 0 12px;">What you can do:</p>
        <ul style="color:#94a3b8;padding-left:20px;margin:0;line-height:2.2;">
          <li>🔍 Scan emails for spam &amp; phishing threats</li>
          <li>📬 Connect your Gmail inbox for real-time analysis</li>
          <li>📊 View threat analytics and history</li>
          <li>🤖 Powered by Naive Bayes · SVM · DistilBERT</li>
        </ul>
      </div>
      <p style="color:#475569;font-size:13px;margin-top:24px;">
        This is an automated security notification. Please do not reply to this email.
      </p>
    </td></tr>
  </table>
</body>
</html>
"""
    _send_email(to, "🛡️ Welcome to Smart Spam AI – Account Created", html)


def send_login_notification(to: str, name: str, ip: str = "unknown"):
    from datetime import timezone
    now = datetime.now().strftime("%d %b %Y, %H:%M UTC")
    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#04040a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;">
    <tr><td style="background:linear-gradient(135deg,#0ea5e9,#7c3aed);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
      <div style="font-size:28px;margin-bottom:8px;">🔐</div>
      <h1 style="color:#fff;margin:0;font-size:22px;">New Sign-in Detected</h1>
    </td></tr>
    <tr><td style="background:#080815;border:1px solid rgba(255,255,255,0.07);border-top:none;border-radius:0 0 16px 16px;padding:36px;">
      <p style="color:#94a3b8;font-size:15px;">Hi <strong style="color:#f1f5f9;">{name}</strong>,</p>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;">
        A new sign-in to your Smart Spam AI account was just detected.
      </p>
      <div style="background:rgba(14,165,233,0.08);border:1px solid rgba(14,165,233,0.2);border-radius:12px;padding:20px;margin:20px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#64748b;font-size:13px;padding:6px 0;">Account</td>
              <td style="color:#f1f5f9;font-size:13px;font-weight:600;">{to}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:6px 0;">Time</td>
              <td style="color:#f1f5f9;font-size:13px;font-weight:600;">{now}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:6px 0;">IP Address</td>
              <td style="color:#f1f5f9;font-size:13px;font-weight:600;">{ip}</td></tr>
        </table>
      </div>
      <p style="color:#f59e0b;font-size:13px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:12px;">
        ⚠️ If this wasn't you, please change your password immediately.
      </p>
    </td></tr>
  </table>
</body>
</html>
"""
    _send_email(to, "🔐 New Sign-in to Smart Spam AI", html)
