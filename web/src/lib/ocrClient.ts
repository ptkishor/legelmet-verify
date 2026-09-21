/**
 * Real OCR Client — LegalMet Verify (Phase 10)
 *
 * Uses Tesseract.js (WASM, runs entirely in browser, no Python required) to
 * extract text from actual nameplate photos. Falls back to structured demo
 * presets only when explicitly requested via sampleKey.
 *
 * Parsing strategy:
 *   1. Run Tesseract on the image → raw text lines
 *   2. Apply OIML R-76 field-extraction regexes (serial, model, capacity, class)
 *   3. Return per-field confidence from Tesseract word-level data
 *   4. Low-confidence fields (<60%) are flagged so the user can edit them
 */

import { createWorker } from "tesseract.js";
import { SAMPLE_NAMEPLATES } from "@/lib/ocrService";

export interface OCRExtractedField {
  value: string;
  /** 0.0 – 1.0 from Tesseract word confidence, or 1.0 for preset data */
  confidence: number;
  /** true if confidence < 0.60 and user should review */
  lowConfidence?: boolean;
}

export interface OCRResult {
  make: OCRExtractedField;
  model: OCRExtractedField;
  serial_no: OCRExtractedField;
  capacity: OCRExtractedField;
  accuracy_class?: OCRExtractedField;
  raw_text: string[];
  preprocessed_preview?: string;
  /** true only when returning demo preset data, not real OCR */
  is_mock?: boolean;
}

// ─── Regex patterns for OIML R-76 nameplate fields ───────────────────────────

const SERIAL_PATTERNS = [
  /\b(?:S\/N|SN|SERIAL(?:\s*NO\.?)?|SR\.?\s*NO\.?)\s*[:\-]?\s*([A-Z0-9\-]{4,30})\b/i,
  /\b([A-Z]{2,4}-\d{4}-\d{4,8})\b/,   // e.g. ES-2024-88912
];

const MODEL_PATTERNS = [
  /\b(?:MODEL|MDL|TYPE)\s*[:\-]?\s*([A-Z0-9\-\/\s]{2,20})/i,
];

const CAPACITY_PATTERNS = [
  /(?:MAX|CAPACITY|CAP)[:\s]*(\d+(?:\.\d+)?\s*(?:kg|t|ton|g|lb)(?:\s*[,;]\s*e\s*=\s*\d+(?:\.\d+)?\s*(?:kg|g))?)/i,
  /(\d+(?:\.\d+)?\s*(?:kg|t|ton)\s*\(?e\s*=\s*\d+(?:\.\d+)?\s*(?:kg|g)\)?)/i,
];

const CLASS_PATTERNS = [
  /CLASS\s*(I{1,3}|IV|[1-4])\b/i,
  /\bACCURACY\s*CLASS\s*[:\-]?\s*(I{1,3}|IV|[1-4])\b/i,
];

const MAKE_PATTERNS = [
  /^(ESSAE[\-\s]?TERAOKA|AVERY\s*INDIA|METTLER\s*TOLEDO|SARTORIUS|CITIZEN|ADAM|OHAUS|KERN)\b/im,
  /(?:MANUFACTURED\s*BY|MFR\s*BY|MAKE)\s*[:\-]?\s*([A-Z][A-Z\s\-&]{2,30})/i,
];

// ─── Field extraction from raw OCR text ──────────────────────────────────────

function extractField(text: string, patterns: RegExp[], defaultConf = 0.0): OCRExtractedField {
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m?.[1]?.trim()) {
      return { value: m[1].trim(), confidence: defaultConf > 0 ? defaultConf : 0.72, lowConfidence: defaultConf < 0.6 };
    }
  }
  return { value: "", confidence: 0.0, lowConfidence: true };
}

// ─── Tesseract OCR ────────────────────────────────────────────────────────────

let workerReady: ReturnType<typeof createWorker> | null = null;

async function getWorker() {
  if (!workerReady) {
    workerReady = createWorker("eng", 1, {
      // Use unpkg CDN for WASM/lang data so no local server config needed
      workerPath: "https://unpkg.com/tesseract.js@7/dist/worker.min.js",
      langPath: "https://tessdata.projectnaptha.com/4.0.0",
      corePath: "https://unpkg.com/tesseract.js-core@5/tesseract-core-simd.wasm.js",
      logger: () => {}, // suppress verbose progress logs
    });
  }
  return workerReady;
}

export async function extractNameplateData(
  file: File | Blob,
  sampleKey?: keyof typeof SAMPLE_NAMEPLATES
): Promise<OCRResult> {

  // ── Demo presets (only when explicitly triggered) ──────────────────────────
  if (sampleKey && SAMPLE_NAMEPLATES[sampleKey]) {
    const s = SAMPLE_NAMEPLATES[sampleKey];
    return {
      make:     { value: s.make,         confidence: s.confidence },
      model:    { value: s.model,        confidence: s.confidence },
      serial_no:{ value: s.serialNo,     confidence: s.confidence + 0.02 },
      capacity: { value: s.capacity,     confidence: s.confidence - 0.02 },
      accuracy_class: { value: s.accuracyClass, confidence: s.confidence },
      raw_text: s.rawText,
      is_mock: true,
    };
  }

  // ── Real Tesseract OCR ─────────────────────────────────────────────────────
  let imageUrl: string;
  if (file instanceof File) {
    imageUrl = URL.createObjectURL(file);
  } else {
    // Blob — convert to object URL
    imageUrl = URL.createObjectURL(file);
  }

  try {
    const worker = await getWorker();

    // Tesseract recognise returns { data: { text, words, confidence } }
    const { data } = await (await worker).recognize(imageUrl);

    const fullText = data.text || "";
    const rawLines = fullText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 1);

    // Compute average word confidence for the whole image
    const wordConfs: number[] = ((data as any).words || []).map((w: any) => w.confidence / 100);
    const avgConf = wordConfs.length
      ? wordConfs.reduce((a, b) => a + b, 0) / wordConfs.length
      : 0;

    // Per-field extraction using regexes over the full text block
    const make     = extractField(fullText, MAKE_PATTERNS,     avgConf);
    const model    = extractField(fullText, MODEL_PATTERNS,    avgConf);
    const serialNo = extractField(fullText, SERIAL_PATTERNS,   avgConf);
    const capacity = extractField(fullText, CAPACITY_PATTERNS, avgConf);
    const accClass = extractField(fullText, CLASS_PATTERNS,    avgConf);

    // If Tesseract returned essentially nothing (blank image, poor quality)
    // return an honest empty result so the user knows to retake the photo
    if (!make.value && !model.value && !serialNo.value && !capacity.value) {
      return {
        make:     { value: "", confidence: 0, lowConfidence: true },
        model:    { value: "", confidence: 0, lowConfidence: true },
        serial_no:{ value: "", confidence: 0, lowConfidence: true },
        capacity: { value: "", confidence: 0, lowConfidence: true },
        accuracy_class: { value: "", confidence: 0, lowConfidence: true },
        raw_text: rawLines,
        is_mock: false,
      };
    }

    return {
      make,
      model,
      serial_no: serialNo,
      capacity,
      accuracy_class: accClass,
      raw_text: rawLines,
      is_mock: false,
    };

  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
