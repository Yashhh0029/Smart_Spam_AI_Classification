from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, Float
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "spam_classifier.db")

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class User(Base):
    """Registered user accounts."""
    __tablename__ = "users"

    id           = Column(Integer, primary_key=True, index=True)
    email        = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=False)
    password_hash= Column(String, nullable=False)
    avatar_color = Column(String, default="#7c3aed")   # hex colour for avatar
    created_at   = Column(String, default=lambda: datetime.utcnow().isoformat())
    last_login   = Column(String, nullable=True)


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, index=True)
    predicted_is_spam = Column(Boolean)
    user_corrected_is_spam = Column(Boolean)
    spam_score = Column(Float)


class ScanResult(Base):
    """Persists every scan (manual or inbox) for the History tab."""
    __tablename__ = "scan_results"

    id = Column(Integer, primary_key=True, index=True)
    email_id = Column(String, index=True, nullable=True)
    sender = Column(String, nullable=True)
    subject = Column(Text, nullable=True)
    body_preview = Column(Text, nullable=True)   # first 200 chars
    is_spam = Column(Boolean)
    spam_score = Column(Float)
    severity = Column(String)
    threat_category = Column(String, nullable=True)
    heuristic_flags = Column(Text, nullable=True)  # JSON list stored as string
    scanned_at = Column(String, default=lambda: datetime.utcnow().isoformat())


Base.metadata.create_all(bind=engine)
