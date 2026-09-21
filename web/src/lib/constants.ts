/**
 * Application-wide constants.
 *
 * State and district codes used for generating Digital IDs and
 * Certificate Numbers. These match the seed data.
 */

/* ── Indian State & District Codes ── */

export const STATE_CODES: Record<string, string> = {
  Bihar: "BR",
  Haryana: "HR",
  Maharashtra: "MH",
  Karnataka: "KA",
  "Uttar Pradesh": "UP",
} as const;

export const DISTRICT_CODES: Record<string, string> = {
  Patna: "PAT",
  Samastipur: "SAM",
  Siwan: "SIW",
  Vaishali: "VAI",
  Gurugram: "GGN",
  Faridabad: "FBD",
  Pune: "PUN",
  Mumbai: "MUM",
  Bengaluru: "BLR",
  Mysuru: "MYS",
  Lucknow: "LKN",
  Varanasi: "VNS",
  Agra: "AGR",
  Noida: "NOI",
} as const;

/** Which districts belong to which state */
export const STATE_DISTRICTS: Record<string, string[]> = {
  Bihar: ["Patna", "Samastipur", "Siwan", "Vaishali"],
  Haryana: ["Gurugram", "Faridabad"],
  Maharashtra: ["Pune", "Mumbai"],
  Karnataka: ["Bengaluru", "Mysuru"],
  "Uttar Pradesh": ["Lucknow", "Varanasi", "Agra", "Noida"],
} as const;

/* ── Instrument Categories ── */

export const INSTRUMENT_CATEGORIES = [
  "Weighing Scale",
  "Platform Scale",
  "Electronic Weighbridge",
  "Fuel Dispenser",
  "Milk Analyser",
  "Flow Meter",
  "Counter Scale",
  "Crane Scale",
  "Spring Balance",
  "Beam Balance",
] as const;

export type InstrumentCategory = (typeof INSTRUMENT_CATEGORIES)[number];

/* ── Risk Score Configuration ── */

export const RISK_FACTORS = {
  CERTIFICATE_EXPIRED: { points: 40, label: "Certificate expired" },
  EXPIRING_WITHIN_30_DAYS: {
    points: 15,
    label: "Certificate expiring within 30 days",
  },
  OPEN_COMPLAINTS: {
    points: 15,
    max: 30,
    label: "Open complaints (15 pts each, max 30)",
  },
  PREVIOUS_FAIL: { points: 20, label: "Previous inspection failed" },
  NEVER_REVERIFIED: {
    points: 15,
    label: "Never re-verified after 2+ years",
  },
  SERIAL_MISMATCH: {
    points: 25,
    label: "Serial number mismatch previously detected",
  },
} as const;

export const RISK_BANDS = {
  LOW: { min: 0, max: 30, label: "LOW", color: "success" },
  MEDIUM: { min: 31, max: 60, label: "MEDIUM", color: "warning" },
  HIGH: { min: 61, max: 100, label: "HIGH", color: "destructive" },
} as const;

/* ── Validity Periods (in months) per category ── */

export const VALIDITY_MONTHS: Record<string, number> = {
  "Weighing Scale": 12,
  "Platform Scale": 12,
  "Electronic Weighbridge": 12,
  "Fuel Dispenser": 12,
  "Milk Analyser": 12,
  "Flow Meter": 12,
  "Counter Scale": 12,
  "Crane Scale": 12,
  "Spring Balance": 12,
  "Beam Balance": 12,
};

/* ── Inspection Checklist Items (per category) ── */

export const DEFAULT_CHECKLIST_ITEMS = [
  { key: "seal_intact", label: "Seal intact and unbroken" },
  { key: "stamp_present", label: "Verification stamp present and legible" },
  { key: "tare_correct", label: "Tare adjustment correct" },
  { key: "display_legible", label: "Display clearly legible" },
  { key: "zero_balance", label: "Zero balance verified" },
  { key: "no_physical_damage", label: "No physical damage or tampering" },
  { key: "nameplate_readable", label: "Nameplate / serial number readable" },
  { key: "level_indicator", label: "Level indicator functional (if applicable)" },
] as const;

/* ── Application ── */

export const APP_NAME = "LegalMet Verify";
export const APP_TAGLINE =
  "Building Trust, Traceability & Transparency in Legal Metrology";

export const PUBLIC_URL =
  import.meta.env.VITE_PUBLIC_URL || "http://localhost:5173";
export const OCR_SERVICE_URL =
  import.meta.env.VITE_OCR_SERVICE_URL || "http://localhost:8000";
