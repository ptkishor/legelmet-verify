# TEST_CREDENTIALS.md
## LegalMet Verify — State of Bihar Test Accounts
> **Source of truth:** Queried live from Supabase PostgreSQL database.
> **State:** Bihar (`BR`)
> **Districts:** Patna (`PAT`), Samastipur (`SAM`), Siwan (`SIW`), Vaishali (`VAI`)
> **Canonical Password for All Accounts:** **`Password@123`**

---

## 🔑 Login Credentials

| # | Email | Password | Role | Full Name | Jurisdiction |
|---|-------|----------|------|-----------|--------------|
| 1 | `admin@legalmet.gov.in` | `Password@123` | `admin` | Awadhesh Narayan Singh | Bihar (Statewide) |
| 2 | `officer.patna@legalmet.gov.in` | `Password@123` | `metrology_officer` | Alok Kumar Singh | Patna, Bihar |
| 3 | `officer.samastipur@legalmet.gov.in` | `Password@123` | `metrology_officer` | Rakesh Ranjan | Samastipur, Bihar |
| 4 | `officer.siwan@legalmet.gov.in` | `Password@123` | `metrology_officer` | Manoj Kumar Tiwari | Siwan, Bihar |
| 5 | `officer.vaishali@legalmet.gov.in` | `Password@123` | `metrology_officer` | Priya Kumari | Vaishali, Bihar |
| 6 | `trader.patna@gmail.com` | `Password@123` | `business_owner` | Sunil Kumar Verma | Patna, Bihar |
| 7 | `trader.samastipur@gmail.com` | `Password@123` | `business_owner` | Dinesh Yadav | Samastipur, Bihar |
| 8 | `trader.siwan@gmail.com` | `Password@123` | `business_owner` | Amitabh Roy | Siwan, Bihar |
| 9 | `trader.vaishali@gmail.com` | `Password@123` | `business_owner` | Rajeev Ranjan | Vaishali, Bihar |
| 10 | `gatc.lab@legalmet.gov.in` | `Password@123` | `gatc_user` | Dr. Meenakshi Sharma | Central Standards Lab |

---

## 👤 Account & Operational Details

### 1. `admin@legalmet.gov.in` (State Admin)
- **Role:** Admin
- **Name:** Awadhesh Narayan Singh
- **Jurisdiction:** Bihar (Statewide)
- **Designation:** Controller, Legal Metrology Bihar
- **Phone:** +91 98350 00001
- **Access:** Full platform access across Patna, Samastipur, Siwan, and Vaishali. State-level compliance heatmaps, risk matrices, and officer oversight.

---

### 2. `officer.patna@legalmet.gov.in` (Field Officer — Patna)
- **Role:** Metrology Officer
- **Name:** Alok Kumar Singh
- **Jurisdiction:** Patna, Bihar
- **Designation:** Senior Legal Metrology Officer
- **Phone:** +91 98351 23456
- **Assigned Queue / Applications:**
  - `APP-BR-PAT-2026-000003` — **scheduled** (Inspection Queue) — Patliputra Pastry & Bakehouse (Phoenix Scales NXT-15, S/N `PHX-2026-00192`, Digital ID: `LM-IN-BR-PAT-2026-00000003`)
  - `APP-BR-PAT-2026-000001` — **approved** (Completed) — Maurya Sweets (Essae-Teraoka DS-215)
  - `APP-BR-PAT-2026-000002` — **approved** (Completed) — Patna Dairy (Avery India H400-300)
- **Assigned Complaints:**
  - `CMP-BR-PAT-2026-000002` — **resolved** (Rajesh Sahay, display verification)

---

### 3. `officer.samastipur@legalmet.gov.in` (Field Officer — Samastipur)
- **Role:** Metrology Officer
- **Name:** Rakesh Ranjan
- **Jurisdiction:** Samastipur, Bihar
- **Designation:** Inspector of Legal Metrology
- **Phone:** +91 98352 34567
- **Assigned Queue / High-Risk Alerts:**
  - `APP-BR-SAM-2026-000004` — **approved** (Past re-verification expired) — Mithila Krishi Mandi (Mettler Toledo VRS241 Truck Scale, Digital ID: `LM-IN-BR-SAM-2026-00000004`)
  - `CMP-BR-SAM-2026-000001` — **open** (Citizen complaint: Pramod Kumar, grain scale underweight by 5 kg)

---

### 4. `officer.siwan@legalmet.gov.in` (Field Officer — Siwan)
- **Role:** Metrology Officer
- **Name:** Manoj Kumar Tiwari
- **Jurisdiction:** Siwan, Bihar
- **Designation:** Inspector of Legal Metrology
- **Phone:** +91 98353 45678
- **Assigned Queue:**
  - `APP-BR-SIW-2026-000005` — **approved** — Siwan Highway Auto Fuels (Gilbarco Veeder-Root SK700-2 Fuel Dispenser, Digital ID: `LM-IN-BR-SIW-2026-00000005`)

---

### 5. `officer.vaishali@legalmet.gov.in` (Field Officer — Vaishali)
- **Role:** Metrology Officer
- **Name:** Priya Kumari
- **Jurisdiction:** Vaishali, Bihar
- **Designation:** Inspector of Legal Metrology
- **Phone:** +91 98354 56789
- **Assigned Queue:**
  - `APP-BR-VAI-2026-000006` — **approved** — Hajipur Banana Cold Storage (Avery Weigh-Tronix ZM510, Digital ID: `LM-IN-BR-VAI-2026-00000006`)

---

### 6. `trader.patna@gmail.com` (Business Owner — Patna)
- **Name:** Sunil Kumar Verma
- **Shop / Business:** Maurya Sweets & Patna Dairy
- **Jurisdiction:** Patna, Bihar
- **Registered Instruments:**
  - `LM-IN-BR-PAT-2026-00000001` (Essae-Teraoka DS-215, Maurya Sweets) — **verified** (Cert: `LMC-BR-PAT-2026-000001` valid till 2027-03-24)
  - `LM-IN-BR-PAT-2026-00000002` (Avery India H400-300, Patna Dairy) — **verified** (Cert: `LMC-BR-PAT-2026-000002` valid till 2027-01-20)
  - `LM-IN-BR-PAT-2026-00000003` (Phoenix Scales NXT-15, Patliputra Pastry) — **pending** (Scheduled for field verification)

---

### 7. `trader.samastipur@gmail.com` (Business Owner — Samastipur)
- **Name:** Dinesh Yadav
- **Shop / Business:** Mithila Krishi Mandi Terminal
- **Jurisdiction:** Samastipur, Bihar
- **Registered Instrument:**
  - `LM-IN-BR-SAM-2026-00000004` (Mettler Toledo VRS241 Truck Scale) — **expired** (Cert: `LMC-BR-SAM-2025-000889` expired 2026-03-15)

---

### 8. `trader.siwan@gmail.com` (Business Owner — Siwan)
- **Name:** Amitabh Roy
- **Shop / Business:** Siwan Highway Auto Fuels
- **Jurisdiction:** Siwan, Bihar
- **Registered Instrument:**
  - `LM-IN-BR-SIW-2026-00000005` (Gilbarco Veeder-Root SK700-2 Dual MPD) — **verified** (Cert: `LMC-BR-SIW-2026-000001` valid till 2027-02-15)

---

### 9. `trader.vaishali@gmail.com` (Business Owner — Vaishali)
- **Name:** Rajeev Ranjan
- **Shop / Business:** Hajipur Banana Cold Storage & Trading
- **Jurisdiction:** Vaishali, Bihar
- **Registered Instrument:**
  - `LM-IN-BR-VAI-2026-00000006` (Avery Weigh-Tronix ZM510 Batching Scale) — **expiring soon** (Cert: `LMC-BR-VAI-2025-001204` valid till 2026-10-15)

---

### 10. `gatc.lab@legalmet.gov.in` (National Testing Lab)
- **Name:** Dr. Meenakshi Sharma
- **Designation:** Lead Metrologist, Central Pattern Approval Testing Center
- **Access:** `/gatc` Pattern Approval registry and test evaluation dashboard

---

## 🔗 Public QR & Digital ID Verification URLs

| Verification URL | Instrument Details | Location | Expected Result |
|---|---|---|---|
| `/verify/LM-IN-BR-PAT-2026-00000001` | Essae-Teraoka DS-215 (Maurya Sweets) | Patna | ✅ **Valid & Verified** |
| `/verify/LM-IN-BR-PAT-2026-00000002` | Avery India H400-300 (Patna Dairy) | Patna | ✅ **Valid & Verified** |
| `/verify/LM-IN-BR-SAM-2026-00000004` | Mettler Toledo VRS241 (Mithila Mandi) | Samastipur | ❌ **Expired Certificate** |
| `/verify/LM-IN-BR-VAI-2026-00000006` | Avery Weigh-Tronix ZM510 (Hajipur Agro) | Vaishali | ⚠️ **Expiring Soon** |
| `/verify/LM-IN-BR-PAT-2026-99999999` | Non-existent Digital ID | Non-existent | 🚫 **Graceful 404 / Invalid ID** |
