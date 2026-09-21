# 🏆 LegalMet Verify — Smart India Hackathon 2026 Grand Finale Demo Script
## Problem Statement 25036: Online Verification & Compliance Tracking System for Weighing and Measuring Instruments
### Team HackSphere | 5-Minute High-Impact Jury Presentation Script
> **Jurisdiction Focus:** State of Bihar (`BR`) — Districts: Patna (`PAT`), Samastipur (`SAM`), Siwan (`SIW`), Vaishali (`VAI`)

---

## ⏱️ Pitch Timeline Overview (Total: 5 Minutes)

| Act | Theme & Screen | Duration | Key Differentiator Demonstrated |
|:---:|---|:---:|---|
| **Act 1** | **The Citizen Reality & Instant QR Trust** (`/verify`) | 60 sec | Instant public verification without login, Form VII PDF, tamper alerts |
| **Act 2** | **Rural Mandi Offline Field Inspection** (`/officer/inspections` $\rightarrow$ `/officer/sync`) | 120 sec | **#1 Differentiator**: 100% offline field operation, on-device OCR, IndexedDB sync |
| **Act 3** | **State Executive Command & Risk Intelligence** (`/admin` $\rightarrow$ `/admin/risk`) | 60 sec | Recharts analytics suite + transparent 6-factor non-ML risk scoring |
| **Act 4** | **Statutory Audit Trail & Cryptographic State Diff** (`/admin/audit`) | 40 sec | Complete chronological instrument lifecycle & Before/After diff |
| **Act 5** | **Upstream National Standards Traceability** (`/gatc`) | 20 sec | GATC Central Standards Laboratory model pattern approval linkage |

---

## 🎬 Cue-by-Cue Walkthrough Script

### Act 1: The Citizen Reality — Zero-Login QR Verification (0:00 – 1:00)

> **Speaker Says:**  
> *"Respected Jury members, every single day across Bihar, millions of citizens buy groceries, sweets, and fuel, trusting that when the scale shows 1 kilogram, it is actually 1 kilogram. But in reality, paper verification certificates are forged, physical lead seals are swapped, and consumers have zero way to verify accuracy. Meet LegalMet Verify."*

#### Actions on Screen:
1. Navigate to: [`http://localhost:5173`](http://localhost:5173) (Landing page).
2. Click **"Verify Instrument"** in header (or open [`/verify/LM-IN-BR-PAT-2026-00000001`](http://localhost:5173/verify/LM-IN-BR-PAT-2026-00000001)).
3. **Showcase Verified Scale**:
   - Point to the green **"✓ OFFICIALLY VERIFIED & STAMPED"** trust badge.
   - Point to the establishment details: **Maurya Sweets & Confectionery, Patna, Bihar**.
   - Point to device specs: **Essae-Teraoka DS-215**, Serial **`ES-2024-88912`**, Accuracy **Class III**.
   - Click **"Download Form VII Certificate (PDF)"** $\rightarrow$ Show the official Government Form VII certificate with embedded QR code and SHA-256 HMAC cryptographic signature (`a52858ea96...`).
4. **Showcase Expired Device Warning**:
   - In the search bar, enter: `LM-IN-BR-SAM-2026-00000004` (Mithila Krishi Mandi Terminal, Samastipur).
   - Point to the red **"⚠️ CERTIFICATE EXPIRED — STATUTORY VIOLATION"** alert banner.
   - Point to the 1-click **"Report Non-Compliant Scale / File Citizen Complaint"** button.

> **Speaker Says:**  
> *"A consumer scans the QR on the counter, and within 1 second, they see whether the scale is legally valid or expired. No app download, no citizen login required."*

---

### Act 2: The Core Differentiator — Offline Field Stamping in Rural Mandis (1:00 – 3:00)

> **Speaker Says:**  
> *"Now let's step into the shoes of Senior Legal Metrology Officer Alok Kumar Singh in Patna. In Bihar, weighing scales operate in remote agricultural mandis, cold storage terminals, and highway petrol pumps with poor cellular network. Here is how LegalMet Verify handles low connectivity with our offline-first architecture."*

#### Actions on Screen:
1. Open [`/login`](http://localhost:5173/login) $\rightarrow$ Click 1-click demo button **"Field Officer (Patna)"** (`officer.patna@legalmet.gov.in`).
2. Navigate to **"Inspection Queue"** ([`/officer/inspections`](http://localhost:5173/officer/inspections)).
   - Point to the header badge: 🟢 **`Online (Cloud Sync Active)`**.
   - Show the assigned application `APP-BR-PAT-2026-000003` for **Patliputra Pastry & Bakehouse**.
   - Explain: *"Visiting this page pre-caches the full schedule and scale specs into local browser IndexedDB."*
3. **Kill Network (Simulate Entering Rural Mandi / Basement)**:
   - Go to **"Offline Sync Hub"** ([`/officer/sync`](http://localhost:5173/officer/sync)) $\rightarrow$ Click **`Simulate Offline Mode`** *(or disconnect Wi-Fi / set Chrome DevTools to "Offline")*.
   - Point to the instant badge transition: 🟡 **`Local IndexedDB Active`**.
   - Explain: *"Notice officer Alok Kumar Singh remains 100% authenticated. Our offline session persistence ensures zero accidental logouts in the field."*
4. **Conduct Full On-Site Field Inspection Offline**:
   - Return to **"Inspection Queue"** $\rightarrow$ Click **`Start On-Site Inspection →`** on `APP-BR-PAT-2026-000003`.
   - **Tesseract.js On-Device OCR Anti-Tamper Check**:
     - Scroll to Section 1: Physical Nameplate Verification.
     - Click **`⚡ Authentic S/N Match`** $\rightarrow$ Show green **OFFICIAL IDENTITY CONFIRMED (100% Match)**.
     - Click **`⚠️ Swapped Device (Fraud)`** $\rightarrow$ Show red **TAMPER & SUBSTITUTION FRAUD DETECTED** banner.
     - Explain: *"Our client-side Tesseract OCR runs 100% in-browser on the officer's tablet without sending photos over the network, catching physical scale substitution on the spot."*
   - **Physical Calibration Error Verification**:
     - Scroll down to Section 2: Error vs MPE limit table.
     - Show test weights within statutory OIML R 76-1 tolerance.
   - **On-Site Legal Decision**:
     - Point to remarks: *"On-site field verification passed. Official seal affixed."*
     - Click **`Certify & Sign Certificate`**.
     - Show toast: *"Recorded in local IndexedDB! Record will sync automatically when online."*
     - Point to modal: **`QUEUED OFFLINE (IndexedDB)`** with cryptographic Client UUIDv4.
5. **Re-enter Network Coverage & Automatic Idempotent Sync**:
   - Click **`Inspect Sync Hub`** ([`/officer/sync`](http://localhost:5173/officer/sync)).
   - Show 1 record queued under **Pending Local Push** with status `PENDING SYNC`.
   - Click **`Disable Simulated Offline`** *(or re-enable Wi-Fi)*.
   - **Watch the magic**: The background sync engine fires automatically, toast alerts *"Successfully synced 1 inspection(s)!"*, and the status transitions to 🟢 **`SYNCHRONIZED`**.
   - Click **"Inspection Queue"** $\rightarrow$ **"Completed"** tab: Show application is now **Approved**, and digital Form VII Certificate is generated!

> **Speaker Says:**  
> *"Guaranteed zero data loss. The officer stamps the scale in a remote grain mandi with zero signal, and the moment their tablet reconnects, the central database is updated and the citizen verification portal is live."*

---

### Act 3: State Command Center & Non-ML Regulatory Risk Engine (3:00 – 4:00)

> **Speaker Says:**  
> *"How does the State Controller manage enforcement across Bihar's districts? Let's log in as Controller Awadhesh Narayan Singh."*

#### Actions on Screen:
1. In the sidebar, click the demo switcher at the bottom (or log in as `admin@legalmet.gov.in` / `Password@123`).
2. Land on **State Command Center** ([`/admin`](http://localhost:5173/admin)):
   - **Status Distribution**: Live status breakdown across Patna, Samastipur, Siwan, and Vaishali.
   - **District Comparison**: Compliance metrics comparing Patna, Samastipur, Siwan, and Vaishali.
3. Navigate to **"High-Risk Watchlist"** ([`/admin/risk`](http://localhost:5173/admin/risk)):
   - Point to the header badge: **"Rule-Based Compliance Matrix (0–100)"**.
   - Point to Rank #1: **Mithila Krishi Mandi Terminal (`LM-IN-BR-SAM-2026-00000004`)** in Samastipur.
   - Click the factor tag **`Certificate expired (+40)`** $\rightarrow$ Show the exact arithmetic (+40 expired certificate, +15 open citizen complaint).
   - Point to the **"▶ Run Expiry & Compliance Audit"** button automating statutory notifications.

---

### Act 4: Chronological Audit Trail & State Diffs (4:00 – 4:40)

> **Speaker Says:**  
> *"One of the toughest problems in legal metrology is unauthorized record alteration. We solved this with an append-only cryptographic audit trail."*

#### Actions on Screen:
1. In the sidebar, click **"Immutable Audit Log"** ([`/admin/audit`](http://localhost:5173/admin/audit)).
2. Point to the **"Instrument Chronological Dossier"** tab:
   - Select `LM-IN-BR-PAT-2026-00000001` (Maurya Sweets, Patna).
   - Walk through the visual timeline: registration $\rightarrow$ application $\rightarrow$ inspection $\rightarrow$ Form VII certificate issuance.
3. Showcase **`Inspect State Diff`**:
   - Showcase the side-by-side **BEFORE STATE** vs **AFTER MUTATION** cryptographic JSON diff.

---

### Act 5: Upstream Traceability & Conclusion (4:40 – 5:00)

> **Speaker Says:**  
> *"Finally, legal metrology starts with National Pattern Approvals. In our GATC Standards Lab portal ([`/gatc`](http://localhost:5173/gatc)), every physical model must have a certified pattern approval before a merchant can even apply for commercial registration."*

#### Final 20-Second Pitch Wrap-Up:
> *"LegalMet Verify delivers end-to-end statutory compliance for Smart India Hackathon 2026:  
> 1. Citizen empowerment via instant QR verification  
> 2. Zero-connectivity rural field stamping with on-device OCR  
> 3. Transparent, mathematically audited risk scoring  
> 4. Tamper-evident, append-only cryptographic audit trails.  
> Thank you, and we welcome your questions!"*

---

## 🔑 Canonical Test Credentials Reference (State of Bihar)

| Role | Name | Email | Password | District / Jurisdiction | Key Feature to Demo |
|---|---|---|---|---|---|
| **Admin** | Awadhesh Narayan Singh | `admin@legalmet.gov.in` | `Password@123` | Bihar (Statewide) | Analytics Charts, Risk Matrix, Audit Ledger |
| **Officer** | Alok Kumar Singh | `officer.patna@legalmet.gov.in` | `Password@123` | Patna, Bihar | Offline Field Stamping, OCR Nameplate Scan |
| **Officer** | Rakesh Ranjan | `officer.samastipur@legalmet.gov.in` | `Password@123` | Samastipur, Bihar | High-Risk Expired Weighbridge & Complaints |
| **Officer** | Manoj Kumar Tiwari | `officer.siwan@legalmet.gov.in` | `Password@123` | Siwan, Bihar | Fuel Dispenser Verification & Certs |
| **Officer** | Priya Kumari | `officer.vaishali@legalmet.gov.in` | `Password@123` | Vaishali, Bihar | Cold Storage Batching Scale Verification |
| **Trader** | Sunil Kumar Verma | `trader.patna@gmail.com` | `Password@123` | Patna, Bihar | Maurya Sweets Form VII Download & QR |
| **Trader** | Dinesh Yadav | `trader.samastipur@gmail.com` | `Password@123` | Samastipur, Bihar | Expired Alerts, Mandi Terminal |
| **Trader** | Amitabh Roy | `trader.siwan@gmail.com` | `Password@123` | Siwan, Bihar | Highway Auto Fuels Dispenser |
| **Trader** | Rajeev Ranjan | `trader.vaishali@gmail.com` | `Password@123` | Vaishali, Bihar | Hajipur Cold Storage Scale |
| **GATC Lab** | Dr. Meenakshi Sharma | `gatc.lab@legalmet.gov.in` | `Password@123` | Central Standards Lab | Pattern Approvals & Lab Test Reports |
