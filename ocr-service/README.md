# OCR Nameplate Extraction Service

A lightweight FastAPI service that extracts instrument nameplate data
(make, model, serial number, capacity) from photos using PaddleOCR.

## Setup

```bash
cd ocr-service
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## API

```
POST /ocr/nameplate
Content-Type: multipart/form-data
Body: image file

Response: {
  "make": { "value": "...", "confidence": 0.85 },
  "model": { "value": "...", "confidence": 0.72 },
  "serial_no": { "value": "...", "confidence": 0.91 },
  "capacity": { "value": "...", "confidence": 0.65 },
  "raw_text": ["line1", "line2", ...]
}
```

## Tech

- Python 3.10+
- FastAPI + Uvicorn
- PaddleOCR (or EasyOCR as fallback)
- OpenCV for image preprocessing
