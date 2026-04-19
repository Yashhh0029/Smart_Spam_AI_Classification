import os
import pickle
import json
import re
import numpy as np
from typing import List, Dict, Tuple

import nltk
from nltk.corpus import stopwords

try:
    from transformers import pipeline as hf_pipeline
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

try:
    stop_words = set(stopwords.words('english'))
except Exception:
    nltk.download('stopwords')
    stop_words = set(stopwords.words('english'))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'ml', 'models')

# ── Globals ───────────────────────────────────────────────────────────────────
vectorizer = None
nb_model = None
svm_model = None
transformer_model = None
metrics_data = None

# ── Heuristic constants ───────────────────────────────────────────────────────
URGENCY_KEYWORDS = [
    'urgent', 'immediate', 'action required', 'suspended', 'locked',
    'winner', 'prize', 'claim', 'invoice', 'free', 'alert', 'verify',
    'confirm', 'update', 'limited', 'expire', 'warning', 'notice',
]

PHISHING_DOMAINS = re.compile(
    r'\.(?:xyz|top|link|online|cf|tk|win|gq|ml|click|download|stream|country|bid|trade|loan|science|party|review|accountant)$',
    re.IGNORECASE
)

IP_LINK_RE = re.compile(r'https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}')
URL_RE = re.compile(r'\bhttps?://\S+|\bwww\.\S+', re.IGNORECASE)


def load_models():
    global vectorizer, nb_model, svm_model, transformer_model, metrics_data

    def _load(path):
        if os.path.exists(path):
            with open(path, 'rb') as f:
                return pickle.load(f)
        return None

    vectorizer = _load(os.path.join(MODEL_DIR, 'vectorizer.pkl'))
    nb_model   = _load(os.path.join(MODEL_DIR, 'nb_model.pkl'))
    svm_model  = _load(os.path.join(MODEL_DIR, 'svm_model.pkl'))

    metrics_path = os.path.join(MODEL_DIR, 'metrics.json')
    if os.path.exists(metrics_path):
        with open(metrics_path, 'r') as f:
            metrics_data = json.load(f)

    if TRANSFORMERS_AVAILABLE:
        try:
            transformer_model = hf_pipeline(
                "text-classification",
                model="mrm8488/bert-tiny-finetuned-sms-spam-detection"
            )
            print("✅ Transformer model loaded.")
        except Exception as e:
            print(f"⚠️  Transformer model unavailable: {e}")


def clean_text(text: str) -> str:
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    text = text.lower()
    return ' '.join(w for w in text.split() if w not in stop_words)


def get_word_contributions(text: str) -> List[Dict]:
    """Explainability: per-word spam probability from Naive Bayes log probabilities."""
    if vectorizer is None or nb_model is None:
        return []

    cleaned_words = clean_text(text).split()
    if not cleaned_words:
        return []

    contributions = []
    vec_words = vectorizer.transform(cleaned_words)
    for i, word in enumerate(cleaned_words):
        prob = nb_model.predict_proba(vec_words[i])[0]
        contributions.append({"word": word, "spam_score": round(float(prob[1]), 4)})

    return sorted(contributions, key=lambda x: x["spam_score"], reverse=True)


def check_heuristics(sender: str, subject: str, body: str) -> Tuple[List[str], List[str], float]:
    """
    Returns:
        heuristic_flags   – general issues (shown in all results)
        phishing_indicators – specifically phishing signals
        bonus_score       – additive spam score adjustment [0, 0.45]
    """
    flags: List[str] = []
    phishing: List[str] = []
    bonus = 0.0

    # ── Sender analysis ───────────────────────────────────────────────
    sender_lower = sender.lower()
    sender_domain_match = re.search(r'@([\w.-]+)', sender_lower)
    sender_domain = sender_domain_match.group(1) if sender_domain_match else ''

    if re.search(r'\d{4,}', sender):
        flags.append("Sender Contains Suspicious Numbers")
        bonus += 0.10

    if sender_domain and PHISHING_DOMAINS.search('.' + sender_domain):
        phishing.append("Suspicious TLD in Sender Domain")
        bonus += 0.20

    # Display name ≠ actual domain (e.g. "PayPal <admin@xyz.tk>")
    display_name_match = re.match(r'^"?([^<"]+)"?\s*<', sender)
    if display_name_match:
        brand_name = display_name_match.group(1).lower()
        known_brands = ['paypal', 'amazon', 'google', 'apple', 'microsoft', 'netflix', 'bank', 'ebay']
        for brand in known_brands:
            if brand in brand_name and brand not in sender_domain:
                phishing.append(f"Brand Impersonation: '{brand_name.strip()}' mismatches domain")
                bonus += 0.25
                break

    # ── Subject analysis ──────────────────────────────────────────────
    subject_lower = subject.lower()

    if subject and len(subject) > 5:
        upper_ratio = sum(1 for c in subject if c.isupper()) / len(subject)
        if upper_ratio > 0.6:
            flags.append("Excessive Capitalization in Subject")
            bonus += 0.10

    if any(kw in subject_lower for kw in URGENCY_KEYWORDS):
        flags.append("Urgency / Bait Keywords in Subject")
        bonus += 0.15

    exclamations = subject.count('!') + subject.count('?')
    if exclamations >= 3:
        flags.append("Excessive Punctuation in Subject")
        bonus += 0.05

    # ── Body analysis ─────────────────────────────────────────────────
    body_lower = body.lower()

    # IP-based links (very strong phishing indicator)
    if IP_LINK_RE.search(body):
        phishing.append("Raw IP Address Used as Link Target")
        bonus += 0.25

    # Generic URLs
    urls = URL_RE.findall(body)
    if urls:
        flags.append(f"Contains {len(urls)} URL(s)")
        bonus += 0.05
        for url in urls:
            domain_m = re.search(r'https?://([^/\s]+)', url)
            if domain_m and PHISHING_DOMAINS.search(domain_m.group(1)):
                phishing.append("Suspicious Domain in Body Link")
                bonus += 0.15
                break

    if re.search(r'\b(bank account|credit card|ssn|social security|password|login credentials)\b', body_lower):
        phishing.append("Requests Sensitive Personal Information")
        bonus += 0.20

    money_re = re.search(r'\$[\d,]+|\d+\s*(?:usd|eur|gbp)', body_lower)
    if money_re:
        flags.append("Contains Monetary Offer/Amount")
        bonus += 0.05

    return flags, phishing, round(min(bonus, 0.45), 4)


def _classify_threat(is_spam: bool, phishing_indicators: List[str], spam_score: float) -> str:
    if not is_spam:
        return "legitimate"
    if phishing_indicators or spam_score > 80:
        return "phishing"
    return "spam"


def predict(sender: str, subject: str, body: str) -> Dict:
    global vectorizer, nb_model, svm_model, transformer_model

    if vectorizer is None:
        load_models()
    if vectorizer is None:
        raise Exception("Models not trained yet. Run backend/ml/setup_data.py first.")

    combined_text = f"{subject} {body}"
    cleaned = clean_text(combined_text)
    vec = vectorizer.transform([cleaned])

    # ── Model probabilities ───────────────────────────────────────────
    nb_prob  = nb_model.predict_proba(vec)[0]
    svm_prob = svm_model.predict_proba(vec)[0]

    transformer_spam_prob = 0.5
    if transformer_model is not None:
        try:
            res = transformer_model(combined_text[:512])[0]
            label = res['label'].lower()
            score = float(res['score'])
            transformer_spam_prob = score if ('spam' in label or '1' in label) else 1.0 - score
        except Exception as e:
            print(f"Transformer inference error: {e}")

    # ── Heuristics ────────────────────────────────────────────────────
    heuristic_flags, phishing_indicators, heuristic_bonus = check_heuristics(sender, subject, body)

    # ── Aggregate score ───────────────────────────────────────────────
    base_score = float((nb_prob[1] + svm_prob[1] + transformer_spam_prob) / 3.0)
    agg_score  = float(round(min(base_score + heuristic_bonus, 1.0), 4))
    spam_pct   = float(round(agg_score * 100, 2))

    is_spam  = bool(agg_score > 0.5)
    severity = "High" if agg_score > 0.75 else ("Medium" if agg_score > 0.45 else "Low")
    category = _classify_threat(is_spam, phishing_indicators, spam_pct)

    word_contributions = get_word_contributions(combined_text)

    return {
        "is_spam": is_spam,
        "spam_score": spam_pct,
        "severity": severity,
        "threat_category": category,
        "models": {
            "naive_bayes":  float(round(float(nb_prob[1]) * 100, 2)),
            "svm":          float(round(float(svm_prob[1]) * 100, 2)),
            "transformer":  float(round(float(transformer_spam_prob) * 100, 2)),
        },
        "explainability":      word_contributions[:20],
        "heuristic_flags":     heuristic_flags,
        "phishing_indicators": phishing_indicators,
    }


def get_metrics() -> Dict:
    if metrics_data is None:
        load_models()
    return metrics_data or {}
