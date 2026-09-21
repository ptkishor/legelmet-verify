# LegalMet Verify

> Building Trust, Traceability & Transparency in Legal Metrology

An online verification system for weighing and measuring instruments,
built for Smart India Hackathon 2026 (Problem Statement 25036).

## Project Structure

```
├── web/                 # React frontend (Vite + TypeScript + Tailwind + shadcn/ui)
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   │   └── ui/      # shadcn/ui components
│   │   ├── lib/         # Supabase client, utilities, constants
│   │   ├── pages/       # Page components
│   │   └── types/       # TypeScript type definitions
│   └── ...
├── ocr-service/         # Python FastAPI + PaddleOCR microservice
├── supabase/
│   └── migrations/      # Numbered SQL migration files
└── README.md
```

## Tech Stack

| Layer           | Technology                               |
| --------------- | ---------------------------------------- |
| Frontend        | React 18 + Vite + TypeScript + Tailwind  |
| UI Components   | shadcn/ui                                |
| Backend / DB    | Supabase (PostgreSQL + Auth + RLS)       |
| OCR Service     | Python + FastAPI + PaddleOCR             |
| PDF Generation  | pdf-lib                                  |
| QR Codes        | qrcode (npm) + html5-qrcode             |

## Quick Start

```bash
# Frontend
cd web
cp .env.example .env.local   # Fill in your Supabase credentials
npm install
npm run dev

# OCR Service (optional, for Phase 10)
cd ocr-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Team

**HackSphere** — Smart India Hackathon 2026
