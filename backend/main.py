from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from . import ml_service, database, gmail_service, imap_service, auth
from typing import List, Optional
from datetime import datetime
import json
import random

app = FastAPI(title="Smart Spam AI API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── DB dependency ──────────────────────────────────────────────────────────────
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Request / Response schemas ─────────────────────────────────────────────────
class PredictRequest(BaseModel):
    sender: str = ""
    subject: str = ""
    body: str = ""

class FetchEmailRequest(BaseModel):
    access_token: Optional[str] = None
    use_mock: bool = False

class BulkScanRequest(BaseModel):
    emails: List[PredictRequest]

class SingleEmailScanRequest(BaseModel):
    email_id: str
    sender: str = ""
    subject: str = ""
    body: str = ""

class IMAPFetchRequest(BaseModel):
    email_address: str
    app_password: str
    max_results: int = 15

class FeedbackRequest(BaseModel):
    text: str
    predicted_is_spam: bool
    user_corrected_is_spam: bool
    spam_score: float

# ── Auth schemas ──────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: str = ""

class LoginRequest(BaseModel):
    email: str
    password: str


# ── Startup ────────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    print("🚀 Smart Spam AI v2 starting…")
    try:
        ml_service.load_models()
        print("✅ Models loaded.")
    except Exception as e:
        print(f"⚠️  Model pre-load failed (will retry on first request): {e}")


# ── Helper: persist scan result ───────────────────────────────────────────────
def _save_scan(db: Session, email_id: str, sender: str, subject: str, body: str, result: dict):
    try:
        record = database.ScanResult(
            email_id=email_id,
            sender=sender[:200] if sender else "",
            subject=subject[:300] if subject else "",
            body_preview=(body[:200] if body else ""),
            is_spam=result["is_spam"],
            spam_score=result["spam_score"],
            severity=result["severity"],
            threat_category=result.get("threat_category", ""),
            heuristic_flags=json.dumps(result.get("heuristic_flags", []) + result.get("phishing_indicators", [])),
            scanned_at=datetime.utcnow().isoformat(),
        )
        db.add(record)
        db.commit()
    except Exception as e:
        print(f"⚠️  Failed to save scan result: {e}")
        db.rollback()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.post("/api/predict")
async def predict_spam(req: PredictRequest, db: Session = Depends(get_db)):
    if not req.body.strip() and not req.subject.strip():
        raise HTTPException(status_code=400, detail="Subject or body must not be empty.")
    try:
        result = ml_service.predict(req.sender, req.subject, req.body)
        _save_scan(db, "manual", req.sender, req.subject, req.body, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/fetch-emails")
async def fetch_emails(req: FetchEmailRequest):
    if req.use_mock or not req.access_token:
        return {"status": "success", "data": gmail_service.generate_mock_emails(), "is_mock": True}
    try:
        emails = gmail_service.fetch_emails_from_gmail(req.access_token)
        return {"status": "success", "data": emails, "is_mock": False}
    except Exception as e:
        print(f"Gmail error: {e}")
        return {
            "status": "fallback",
            "data": gmail_service.generate_mock_emails(),
            "error": str(e),
            "is_mock": True,
        }


@app.post("/api/fetch-emails-imap")
async def fetch_emails_imap(req: IMAPFetchRequest):
    """
    Fetch real emails from Gmail via IMAP + App Password.
    Works immediately without Google Cloud setup.
    Credentials are used once and never stored.
    """
    try:
        emails = imap_service.fetch_gmail_via_imap(
            req.email_address, req.app_password, req.max_results
        )
        return {"status": "success", "data": emails, "is_mock": False}
    except PermissionError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"IMAP connection failed: {str(e)}")


@app.post("/api/scan-email")
async def scan_single_email(req: SingleEmailScanRequest, db: Session = Depends(get_db)):
    """Scan a single inbox email by its content. Used by the Inbox tab."""
    if not req.body.strip() and not req.subject.strip():
        raise HTTPException(status_code=400, detail="Email has no scannable content.")
    try:
        result = ml_service.predict(req.sender, req.subject, req.body)
        _save_scan(db, req.email_id, req.sender, req.subject, req.body, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/scan-bulk")
async def scan_bulk(req: BulkScanRequest, db: Session = Depends(get_db)):
    """Scan all emails in the inbox list at once."""
    results = []
    for i, email in enumerate(req.emails):
        try:
            res = ml_service.predict(email.sender, email.subject, email.body)
            _save_scan(db, f"bulk_{i}", email.sender, email.subject, email.body, res)
            results.append({"email": email.dict(), "analysis": res})
        except Exception as e:
            results.append({"email": email.dict(), "error": str(e)})
    return results


@app.get("/api/metrics")
async def get_model_metrics():
    try:
        m = ml_service.get_metrics()
        if not m:
            return {"status": "Models not trained yet"}
        return m
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/scan-history")
async def get_scan_history(limit: int = Query(default=50, le=200), db: Session = Depends(get_db)):
    """Return recent scan results for the History tab (newest first)."""
    try:
        rows = (
            db.query(database.ScanResult)
            .order_by(database.ScanResult.id.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": r.id,
                "email_id": r.email_id,
                "sender": r.sender,
                "subject": r.subject,
                "body_preview": r.body_preview,
                "is_spam": r.is_spam,
                "spam_score": r.spam_score,
                "severity": r.severity,
                "threat_category": r.threat_category,
                "heuristic_flags": json.loads(r.heuristic_flags) if r.heuristic_flags else [],
                "scanned_at": r.scanned_at,
            }
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/feedback")
async def submit_feedback(req: FeedbackRequest, db: Session = Depends(get_db)):
    try:
        fb = database.Feedback(
            text=req.text,
            predicted_is_spam=req.predicted_is_spam,
            user_corrected_is_spam=req.user_corrected_is_spam,
            spam_score=req.spam_score,
        )
        db.add(fb)
        db.commit()
        return {"status": "success", "message": "Feedback submitted."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
async def health():
    return {"status": "online", "version": "2.0.0"}


# ══════════════════════════════════════════════════════════════════════════════
# AUTH ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

AVATAR_COLORS = ["#7c3aed","#0ea5e9","#10b981","#f43f5e","#f59e0b","#8b5cf6","#ec4899"]

@app.post("/api/auth/register")
async def register(req: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    """Create a new account, send welcome email, return JWT token."""
    # Normalise email
    email = req.email.lower().strip()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address.")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    existing = db.query(database.User).filter(database.User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    display_name = req.display_name.strip() or email.split("@")[0].capitalize()
    color        = random.choice(AVATAR_COLORS)
    pw_hash      = auth.hash_password(req.password)

    user = database.User(
        email=email,
        display_name=display_name,
        password_hash=pw_hash,
        avatar_color=color,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth.create_token(user.id, user.email)

    # Fire-and-forget welcome email (doesn't block response)
    import threading
    threading.Thread(target=auth.send_welcome_email, args=(email, display_name), daemon=True).start()

    return {
        "status": "created",
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "avatar_color": user.avatar_color,
            "created_at": user.created_at,
        }
    }


@app.post("/api/auth/login")
async def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticate with email + password, send login notification, return JWT."""
    email = req.email.lower().strip()
    user  = db.query(database.User).filter(database.User.email == email).first()

    if not user or not auth.verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    # Update last login
    user.last_login = datetime.utcnow().isoformat()
    db.commit()

    token = auth.create_token(user.id, user.email)
    client_ip = request.client.host if request.client else "unknown"

    import threading
    threading.Thread(target=auth.send_login_notification, args=(email, user.display_name, client_ip), daemon=True).start()

    return {
        "status": "ok",
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "avatar_color": user.avatar_color,
            "created_at": user.created_at,
            "last_login": user.last_login,
        }
    }


@app.get("/api/auth/me")
async def get_me(token: str = Query(...), db: Session = Depends(get_db)):
    """Decode token and return current user profile."""
    payload = auth.verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token is invalid or expired.")
    user = db.query(database.User).filter(database.User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "avatar_color": user.avatar_color,
        "created_at": user.created_at,
        "last_login": user.last_login,
    }


@app.get("/api/auth/users")
async def list_users(db: Session = Depends(get_db)):
    """Return all registered user emails + display names for the account-picker UI."""
    users = db.query(database.User).order_by(database.User.last_login.desc().nullslast()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "display_name": u.display_name,
            "avatar_color": u.avatar_color,
            "last_login": u.last_login,
        }
        for u in users
    ]
