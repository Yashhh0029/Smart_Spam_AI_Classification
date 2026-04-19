# 🛡️ Smart Spam AI  
### A Predictive, Hybrid-Intelligence Email Security Guardian

> **Smart Spam AI is not a keyword filter.**  
> It is a cognitive, dynamically-adaptive threat intelligence system designed to intercept, analyze, and neutralize deep-layered phishing vectors before they reach your inbox.

---

## 🌌 Vision

Smart Spam AI is a **next-generation cybersecurity assistant** built around **transparent, explainable AI**, moving beyond rigid traditional blackbox classifiers.

Unlike standard inbox filters, Smart Spam AI:
- Understands intent, urgency, and semantic manipulation
- Intercepts zero-day phishing through deterministic heuristic checks
- Operates autonomously with multi-model verification
- Acts as a trusted, explainable security companion, breaking down *why* an email is dangerous

This project is engineered with **research-grade architecture**, **machine-learning pipelines**, and **real-time system integration**, targeting an **enterprise-level design philosophy**.

---

## 🧠 Core Design Philosophy

| Principle | Description |
|---------|------------|
| Multi-Dimensional Intelligence | Evaluates threats using probabilities (Naive Bayes), high-dimensional geometry (SVM), and semantic context (DistilBERT). |
| True Explainability (XAI) | Deconstructs threat matrices into human-readable, word-by-word contribution scores. |
| Hybrid Heuristics | Fuses heavy AI with deterministic pattern matching (URL spoofing, strict IP checks, urgency baiting). |
| Live Data Integration | Natively connects to real Gmail accounts via direct IMAP without complex cloud wrappers. |
| Modular Security | Clear separation of predictive logic, data ingestion, threat evaluation, and notification. |
| Proactive Defense | Dispatches real-time automated SMTP alerts upon unauthorized access or registration. |

---

## 🏗️ System Architecture (High Level)

```text
Live Inbox (IMAP) / Manual Input
   ↓
Data Normalization & HTML Stripper
   ↓
Smart Spam AI Cognitive Core
(DistilBERT + Naive Bayes + SVM)
   ↓
Heuristics Engine
(Extracts Zero-Day Phishing Footprints)
   ↓
Threat Evaluator (Score Aggregation)
   ↓
Glassmorphism Real-Time UI (Vite + React)
   ↓
Analytics Engine (SQLite + Logging)
```

---

## 🚀 Key Features

### 📬 Inbox Integration
- Direct, fully offline-compatible IMAP connection
- Live fetching of real user emails
- Connects securely using only 16-character App Passwords
- "Scan All" batch processing for comprehensive inbox audits

### 🧠 Triple-Threat AI Intelligence
- Local inference using Scikit-Learn models and HuggingFace pipelines
- Automatic model fallback handling
- Highly sensitive probability calibration
- Categorizes threats into Spam vs. Critical Phishing

### 👁️ Explainable AI & Threat Breakdown 
- Real-time threat gauge visualization
- Extracts and highlights the exact words driving the spam score
- Lists specific heuristic flags (e.g., "Brand Impersonation: PayPal mismatches domain")

### 🖥️ Security & Authenticity
- Custom-built JWT Auth generation
- PBKDF2 Password Hashing
- Dynamic, fire-and-forget SMTP email alerting system
- Fully tracked threat scanning history database

### 🎨 Cinematic User Experience
- Built natively with standard CSS and Framer Motion
- Glassmorphism dashboards and immersive particle mechanics
- Deeply reactive components with smooth layout transitions

---

## 🧩 Project Structure

```text
SPAM Classification/
├── backend/                 # FastAPI ML Server
│   ├── main.py              # Core API entry point
│   ├── auth.py              # JWT & SMTP Dispatch Engine
│   ├── ml_service.py        # ML Aggregation & Heuristics
│   ├── gmail_service.py     # OAuth Fallback & Mock Generators
│   ├── imap_service.py      # Direct Gmail Protocol Driver
│   ├── database.py          # SQLite Persistence Layer
│   ├── ml/                  # Pre-trained core models
│   └── .env                 # Environment secrets
├── frontend/                # Vite + React Dashboard
│   ├── src/
│   │   ├── components/      # Glassmorphism UI modules
│   │   ├── App.css          # Core visual styling
│   │   ├── index.css        # Typography & variables
│   │   └── main.tsx         # Application root
│   └── .env.example
├── requirements.txt
└── README.md
```

---

## 🛠️ Technology Stack

| Category | Technology |
|--------|------------|
| Language | Python 3.10+, TypeScript |
| AI / LLM | Scikit-Learn, HuggingFace Transformers (DistilBERT) |
| Backend | FastAPI, SQLAlchemy |
| Frontend | React 19, Vite, Recharts |
| Animation | Framer Motion |
| Architecture | Direct IMAP, SQLite, REST |
| Platform | Windows, Cloud Deployable |

---

## ▶️ How to Run

### 1. Backend Engine
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

### 2. Frontend Interface
```bash
cd frontend
npm install
npm run dev
```

---

## 🎯 Use Cases
- Personal cybersecurity gateway
- Enterprise phishing research
- Analytics tracking for corporate email domains
- Demonstrator for Explainable AI (XAI) limits

---

## 🔮 Future Advancements

Smart Spam AI is designed as a continuously evolving cybersecurity protocol.  
Future development focuses on deeper behavioral tracking, autonomous deletion, and multimodal checking.

- **URL Depth-Scanning** – Automatically curling and checking links inside isolated containers before delivery.
- **Multimodal Threat Detection** – Analyzing attached PDFs, images, and embedded QR codes.
- **Sender Reputation Tracking** – Long-term profiling of domains to flag initially dormant sleeper domains over time.
- **Autonomous Remediation** – User-configurable settings to auto-delete or auto-forward high-severity phishing immediately upon hit.
- **Cross-Platform Syncing** – Moving from SQLite to PostgreSQL for multi-device login consistency. 
- **Plugin-Based Security** – Extensible architecture to plug in specialized detection algorithms for crypto or banking scams.  

> *“Smart Spam AI is not built to randomly filter text,  
but to stand guard — proactively, transparently, and intelligently.”*

---

## 👨‍💻 Author

**Yash Kadam**  
AI & ML Engineer | Builder of Human-Centric, Emotion-Aware AI Systems  

> “I didn’t want to build a simple keyword scanner.  
> I wanted to build a security system that actually understands the threat.”
