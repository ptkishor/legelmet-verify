-- ============================================================
-- 004_seed.sql
-- LegalMet Verify — Realistic Hackathon Seed Data
-- ============================================================
-- Run this AFTER 001_schema.sql, 002_rls.sql, and 003_functions.sql.
--
-- This populates:
-- 1. Test Users in auth.users (encrypted passwords with bcrypt)
-- 2. Explicit Profiles with roles and jurisdictions
-- 3. Instruments across 4 states & 10 districts
-- 4. Applications (submitted, assigned, scheduled, inspected, approved)
-- 5. Field Inspections (with metrological checklist + readings JSON)
-- 6. Verification Certificates (with tamper-evident SHA-256 signatures)
-- 7. Citizen Complaints (open, assigned, resolved)
-- 8. GATC Pattern Approval Test Reports
-- 9. Expiry & System Notifications
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ────────────────────────────────────────────────
-- 1. TEST USERS (auth.users & profiles)
-- ────────────────────────────────────────────────
-- Standard Demo Password for all accounts: "Password@123"
-- (bcrypt hash generated via crypt('Password@123', gen_salt('bf', 10)))

DO $$
DECLARE
  v_pw_hash text := crypt('Password@123', gen_salt('bf', 10));
BEGIN

  -- 1.1 State Admin (Haryana)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'admin@legalmet.gov.in', v_pw_hash, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Rajeshwar Rao","role":"admin","jurisdiction_state":"Haryana","jurisdiction_district":"Gurugram","designation":"Joint Controller, Legal Metrology"}'::jsonb,
    now(), now()
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  -- 1.2 Metrology Officer (Gurugram, Haryana)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'b0000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated',
    'officer.gurugram@legalmet.gov.in', v_pw_hash, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Vikram Singh","phone":"+91 98112 34567","role":"metrology_officer","jurisdiction_state":"Haryana","jurisdiction_district":"Gurugram","designation":"Senior Legal Metrology Officer"}'::jsonb,
    now(), now()
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  -- 1.3 Metrology Officer (Pune, Maharashtra)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'b0000000-0000-0000-0000-000000000003',
    'authenticated', 'authenticated',
    'officer.pune@legalmet.gov.in', v_pw_hash, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Sanjay Kulkarni","phone":"+91 98220 98765","role":"metrology_officer","jurisdiction_state":"Maharashtra","jurisdiction_district":"Pune","designation":"Inspector of Legal Metrology"}'::jsonb,
    now(), now()
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  -- 1.4 Metrology Officer (Bengaluru, Karnataka)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'b0000000-0000-0000-0000-000000000004',
    'authenticated', 'authenticated',
    'officer.bengaluru@legalmet.gov.in', v_pw_hash, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ananth Narayan","phone":"+91 99001 23456","role":"metrology_officer","jurisdiction_state":"Karnataka","jurisdiction_district":"Bengaluru","designation":"Assistant Controller of Metrology"}'::jsonb,
    now(), now()
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  -- 1.5 GATC Testing Lab Technician (Gurugram)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'c0000000-0000-0000-0000-000000000005',
    'authenticated', 'authenticated',
    'gatc.lab@legalmet.gov.in', v_pw_hash, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Dr. Meenakshi Sharma","phone":"+91 98100 11223","role":"gatc_user","jurisdiction_state":"Haryana","jurisdiction_district":"Gurugram","designation":"Lead Metrologist, Central Testing Lab"}'::jsonb,
    now(), now()
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  -- 1.6 Business Owner (Haryana - Sharma Sweets & Dairy)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'd0000000-0000-0000-0000-000000000006',
    'authenticated', 'authenticated',
    'trader.sharma@gmail.com', v_pw_hash, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ramesh Sharma","phone":"+91 98111 88888","role":"business_owner","jurisdiction_state":"Haryana","jurisdiction_district":"Gurugram","designation":"Proprietor"}'::jsonb,
    now(), now()
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  -- 1.7 Business Owner (Maharashtra - Patil Agro Traders)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'd0000000-0000-0000-0000-000000000007',
    'authenticated', 'authenticated',
    'trader.patil@gmail.com', v_pw_hash, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ganesh Patil","phone":"+91 98222 77777","role":"business_owner","jurisdiction_state":"Maharashtra","jurisdiction_district":"Pune","designation":"Partner"}'::jsonb,
    now(), now()
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

END $$;

-- ────────────────────────────────────────────────
-- 2. EXPLICIT PROFILES UPSERT
-- ────────────────────────────────────────────────
-- Guarantee that role, state, district, and designation are set
-- accurately regardless of any trigger overrides.

INSERT INTO public.profiles (
  id, full_name, phone, role, jurisdiction_state, jurisdiction_district, designation, is_active
) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Rajeshwar Rao', '+91 98100 00001', 'admin', 'Haryana', 'Gurugram', 'Joint Controller, Legal Metrology', true),
  ('b0000000-0000-0000-0000-000000000002', 'Vikram Singh', '+91 98112 34567', 'metrology_officer', 'Haryana', 'Gurugram', 'Senior Legal Metrology Officer', true),
  ('b0000000-0000-0000-0000-000000000003', 'Sanjay Kulkarni', '+91 98220 98765', 'metrology_officer', 'Maharashtra', 'Pune', 'Inspector of Legal Metrology', true),
  ('b0000000-0000-0000-0000-000000000004', 'Ananth Narayan', '+91 99001 23456', 'metrology_officer', 'Karnataka', 'Bengaluru', 'Assistant Controller of Metrology', true),
  ('c0000000-0000-0000-0000-000000000005', 'Dr. Meenakshi Sharma', '+91 98100 11223', 'gatc_user', 'Haryana', 'Gurugram', 'Lead Metrologist, Central Testing Lab', true),
  ('d0000000-0000-0000-0000-000000000006', 'Ramesh Sharma', '+91 98111 88888', 'business_owner', 'Haryana', 'Gurugram', 'Proprietor, Sharma Sweets', true),
  ('d0000000-0000-0000-0000-000000000007', 'Ganesh Patil', '+91 98222 77777', 'business_owner', 'Maharashtra', 'Pune', 'Partner, Patil Agro', true)
ON CONFLICT (id) DO UPDATE SET
  full_name             = EXCLUDED.full_name,
  phone                 = EXCLUDED.phone,
  role                  = EXCLUDED.role,
  jurisdiction_state    = EXCLUDED.jurisdiction_state,
  jurisdiction_district = EXCLUDED.jurisdiction_district,
  designation           = EXCLUDED.designation,
  is_active             = EXCLUDED.is_active;

-- ────────────────────────────────────────────────
-- 3. INSTRUMENTS
-- ────────────────────────────────────────────────
-- Realistic instruments across retail, logistics, manufacturing, and fuel.
-- Explicit digital_id values assigned for predictable QR/verification tests.

INSERT INTO public.instruments (
  id, digital_id, category, make, model, serial_no, capacity, accuracy_class,
  manufacture_year, owner_id, shop_name, address, district, state,
  latitude, longitude, nameplate_photo_url, status, created_at, updated_at
) VALUES
  -- 1. VERIFIED - Counter scale at Sharma Sweets, Gurugram (Flagship Demo)
  (
    'e0000000-0000-0000-0000-000000000001',
    'LM-IN-HR-GGN-2026-00000001',
    'Electronic Weighing Scale',
    'Essae-Teraoka',
    'DS-215',
    'ES-2024-88912',
    '30 kg (e = 5 g)',
    'Class III',
    2024,
    'd0000000-0000-0000-0000-000000000006',
    'Sharma Sweets & Confectionery',
    'Shop No. 14, Sadar Bazar',
    'Gurugram',
    'Haryana',
    28.4595, 77.0266,
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80',
    'verified',
    now() - interval '6 months',
    now() - interval '6 months'
  ),

  -- 2. VERIFIED - Platform Scale at Sharma Sweets Dairy Warehouse
  (
    'e0000000-0000-0000-0000-000000000002',
    'LM-IN-HR-GGN-2026-00000002',
    'Platform Scale',
    'Avery India',
    'H400-300',
    'AV-IN-2023-44102',
    '300 kg (e = 50 g)',
    'Class III',
    2023,
    'd0000000-0000-0000-0000-000000000006',
    'Sharma Dairy & Cold Storage',
    'Plot 42, Sector 18 Industrial Area',
    'Gurugram',
    'Haryana',
    28.4862, 77.0673,
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    'verified',
    now() - interval '8 months',
    now() - interval '8 months'
  ),

  -- 3. EXPIRED (HIGH RISK) - Weighbridge at Patil Agro, Pune
  (
    'e0000000-0000-0000-0000-000000000003',
    'LM-IN-MH-PUN-2026-00000003',
    'Weighbridge',
    'Mettler Toledo',
    'VRS241 Truck Scale',
    'MT-WB-2021-9988',
    '60 Ton (e = 10 kg)',
    'Class III',
    2021,
    'd0000000-0000-0000-0000-000000000007',
    'Patil Agro Mandi Terminal',
    'Gat No. 182, Hadapsar Industrial Estate',
    'Pune',
    'Maharashtra',
    18.5089, 73.9259,
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
    'expired',
    now() - interval '18 months',
    now() - interval '18 months'
  ),

  -- 4. PENDING INSPECTION - New Retail Scale at Sharma Bakery, Gurugram
  (
    'e0000000-0000-0000-0000-000000000004',
    'LM-IN-HR-GGN-2026-00000004',
    'Electronic Weighing Scale',
    'Phoenix Scales',
    'NXT-15',
    'PHX-2026-00192',
    '15 kg (e = 2 g)',
    'Class II',
    2026,
    'd0000000-0000-0000-0000-000000000006',
    'Sharma Pastry & Bakehouse',
    'Galleria Market, DLF Phase IV',
    'Gurugram',
    'Haryana',
    28.4674, 77.0818,
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80',
    'pending',
    now() - interval '3 days',
    now() - interval '3 days'
  ),

  -- 5. REJECTED (FAILED CALIBRATION) - Fuel Dispensing Unit, Pune
  (
    'e0000000-0000-0000-0000-000000000005',
    'LM-IN-MH-PUN-2026-00000005',
    'Fuel Dispensing Unit',
    'Gilbarco Veeder-Root',
    'SK700-2 Dual MPD',
    'GVR-2022-77610',
    '50 L/min',
    'Class 0.5',
    2022,
    'd0000000-0000-0000-0000-000000000007',
    'Shree Ganesh Auto Fuels',
    'Survey No. 34, Nagar Road, Viman Nagar',
    'Pune',
    'Maharashtra',
    18.5679, 73.9143,
    'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
    'rejected',
    now() - interval '2 months',
    now() - interval '2 months'
  ),

  -- 6. VERIFIED - High Precision Laboratory Scale (Bengaluru)
  (
    'e0000000-0000-0000-0000-000000000006',
    'LM-IN-KA-BLR-2026-00000006',
    'Precision Balance',
    'Sartorius',
    'Entris II',
    'SAR-2025-10022',
    '620 g (e = 0.001 g)',
    'Class I',
    2025,
    'd0000000-0000-0000-0000-000000000006',
    'BioTech Labs & Analytical Services',
    'Phase 1, Electronic City',
    'Bengaluru',
    'Karnataka',
    12.8452, 77.6602,
    'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80',
    'verified',
    now() - interval '4 months',
    now() - interval '4 months'
  ),

  -- 7. SUSPENDED - Tampered Scale flagged by Citizen Complaint (Faridabad)
  (
    'e0000000-0000-0000-0000-000000000007',
    'LM-IN-HR-FBD-2026-00000007',
    'Electronic Weighing Scale',
    'Eagle Scales',
    'EG-30',
    'EAG-2020-55410',
    '30 kg (e = 5 g)',
    'Class III',
    2020,
    'd0000000-0000-0000-0000-000000000006',
    'Verma Kirana Store',
    'Main Market, NIT 1',
    'Faridabad',
    'Haryana',
    28.3970, 77.3040,
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80',
    'suspended',
    now() - interval '5 months',
    now() - interval '5 months'
  ),

  -- 8. EXPIRING SOON (Within 15 days) - Mumbai Port Grain Silo Scale
  (
    'e0000000-0000-0000-0000-000000000008',
    'LM-IN-MH-MUM-2026-00000008',
    'Automatic Gravimetric Filling Instrument',
    'Avery Weigh-Tronix',
    'ZM510 Batching Scale',
    'AWT-2023-99014',
    '500 kg (e = 100 g)',
    'Class III',
    2023,
    'd0000000-0000-0000-0000-000000000007',
    'Konkan Logistics & Bulk Terminal',
    'Wadala Truck Terminus',
    'Mumbai',
    'Maharashtra',
    19.0176, 72.8561,
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
    'verified',
    now() - interval '11 months' - interval '15 days',
    now() - interval '11 months' - interval '15 days'
  ),

  -- 9. VERIFIED - Lucknow Fuel Station Pump 1
  (
    'e0000000-0000-0000-0000-000000000009',
    'LM-IN-UP-LKN-2026-00000009',
    'Fuel Dispensing Unit',
    'Tokheim India',
    'Quantium 510',
    'TKH-2024-33100',
    '45 L/min',
    'Class 0.5',
    2024,
    'd0000000-0000-0000-0000-000000000006',
    'Awadh Highway Petro Point',
    'Faizabad Road, Gomti Nagar Extension',
    'Lucknow',
    'Uttar Pradesh',
    26.8601, 81.0125,
    'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
    'verified',
    now() - interval '5 months',
    now() - interval '5 months'
  ),

  -- 10. VERIFIED - Mysuru Silk Emporium Fabric Counter
  (
    'e0000000-0000-0000-0000-000000000010',
    'LM-IN-KA-MYS-2026-00000010',
    'Electronic Weighing Scale',
    'Essae-Teraoka',
    'DS-415',
    'ES-2025-11099',
    '10 kg (e = 1 g)',
    'Class II',
    2025,
    'd0000000-0000-0000-0000-000000000006',
    'Royal Mysore Silks & Sarees',
    'Sayyaji Rao Road, Devaraja Mohalla',
    'Mysuru',
    'Karnataka',
    12.3087, 76.6531,
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80',
    'verified',
    now() - interval '2 months',
    now() - interval '2 months'
  ),

  -- 11. PENDING (SCHEDULED INSPECTION) - Sharma Sweets & Bakery (Branch 2), Gurugram
  (
    'e0000000-0000-0000-0000-000000000011',
    'LM-IN-HR-GGN-2026-00000011',
    'Electronic Weighing Scale',
    'Essae-Teraoka',
    'DS-215',
    'ES-2026-99101',
    '30 kg (e = 5 g)',
    'Class III',
    2026,
    '6e1cd4a7-8703-4a85-b9f3-efcc5f021b94',
    'Sharma Sweets & Bakery (Branch 2)',
    'Booth 42, Sector 14 HUDA Market',
    'Gurugram',
    'Haryana',
    28.4725, 77.0450,
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80',
    'pending',
    now() - interval '1 day',
    now() - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────
-- 4. APPLICATIONS
-- ────────────────────────────────────────────────

INSERT INTO public.applications (
  id, application_no, instrument_id, applicant_id, type, status,
  assigned_officer_id, scheduled_at, documents, remarks, created_at, updated_at
) VALUES
  -- 1. Completed application for verified instrument 1
  (
    'f0000000-0000-0000-0000-000000000001',
    'APP-HR-GGN-2026-000001',
    'e0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000006',
    'new_verification',
    'approved',
    'b0000000-0000-0000-0000-000000000002',
    now() - interval '6 months',
    '{"gst_certificate":"https://example.com/gst.pdf","invoice":"https://example.com/inv.pdf"}'::jsonb,
    'All verification tests passed within permissible limits.',
    now() - interval '6 months' - interval '5 days',
    now() - interval '6 months'
  ),

  -- 2. Pending application for instrument 4 (New Scale at Galleria Market)
  (
    'f0000000-0000-0000-0000-000000000002',
    'APP-HR-GGN-2026-000002',
    'e0000000-0000-0000-0000-000000000004',
    'd0000000-0000-0000-0000-000000000006',
    'new_verification',
    'assigned',
    'b0000000-0000-0000-0000-000000000002',
    now() + interval '2 days',
    '{"model_approval_certificate":"https://example.com/gatc_cert.pdf"}'::jsonb,
    'Officer assigned. On-site physical verification scheduled for 11:30 AM.',
    now() - interval '3 days',
    now() - interval '1 day'
  ),

  -- 3. Re-verification application for expired weighbridge in Pune
  (
    'f0000000-0000-0000-0000-000000000003',
    'APP-MH-PUN-2026-000003',
    'e0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000007',
    're_verification',
    'scheduled',
    'b0000000-0000-0000-0000-000000000003',
    now() + interval '4 days',
    '{"previous_certificate":"LMC-MH-PUN-2026-000981"}'::jsonb,
    'Requires mobile standard test lorry with 20 Ton calibrated weights.',
    now() - interval '5 days',
    now() - interval '2 days'
  ),

  -- 4. Post-repair verification for rejected fuel dispenser in Pune
  (
    'f0000000-0000-0000-0000-000000000004',
    'APP-MH-PUN-2026-000004',
    'e0000000-0000-0000-0000-000000000005',
    'd0000000-0000-0000-0000-000000000007',
    'post_repair',
    'submitted',
    NULL,
    NULL,
    '{"repair_job_card":"https://example.com/gilbarco_repair.pdf"}'::jsonb,
    'Replaced metering unit piston assembly. Awaiting inspector assignment.',
    now() - interval '1 day',
    now() - interval '1 day'
  ),

  -- 5. Scheduled inspection for new instrument in Gurugram
  (
    'f0000000-0000-0000-0000-000000000005',
    'APP-HR-GGN-2026-000005',
    'e0000000-0000-0000-0000-000000000011',
    '6e1cd4a7-8703-4a85-b9f3-efcc5f021b94',
    're_verification',
    'scheduled',
    'cb02d644-9ac1-4103-b941-2fb4cc5dd5f6',
    '2026-09-25 10:00:00+00',
    '{"gst_certificate":"https://example.com/gst.pdf"}'::jsonb,
    'Scheduled on-site reverification of commercial counter scale.',
    now() - interval '1 day',
    now() - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────
-- 5. FIELD INSPECTIONS
-- ────────────────────────────────────────────────

INSERT INTO public.inspections (
  id, application_id, instrument_id, officer_id, checklist, readings,
  photos, latitude, longitude, result, remarks, inspected_at,
  sync_status, client_uuid
) VALUES
  -- 1. Passed Inspection for Counter Scale (Sharma Sweets)
  (
    '70000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    '{
      "nameplate_legible": true,
      "seal_intact": true,
      "spirit_level_centered": true,
      "zero_setting_ok": true,
      "tare_facility_ok": true
    }'::jsonb,
    '{
      "loads": [
        {"test_load_kg": 5, "indicated_kg": 5.000, "error_g": 0.0, "mpe_g": 2.5, "status": "pass"},
        {"test_load_kg": 15, "indicated_kg": 15.002, "error_g": 2.0, "mpe_g": 5.0, "status": "pass"},
        {"test_load_kg": 30, "indicated_kg": 30.003, "error_g": 3.0, "mpe_g": 7.5, "status": "pass"}
      ],
      "eccentricity_error_g": 1.5,
      "repeatability_error_g": 1.0
    }'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80'],
    28.4595, 77.0266,
    'pass',
    'Model approved by GATC (IND/09/2026/118). Lead wire verification seal applied (Seal No: HR-GGN-98442).',
    now() - interval '6 months',
    'synced',
    '90000000-0000-0000-0000-000000000001'
  ),

  -- 2. Passed Inspection for Platform Scale (Sharma Dairy)
  (
    '70000000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000005',
    'e0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    '{
      "nameplate_legible": true,
      "seal_intact": true,
      "platform_clean_rigid": true,
      "zero_setting_ok": true
    }'::jsonb,
    '{
      "loads": [
        {"test_load_kg": 50, "indicated_kg": 50.00, "error_g": 0.0, "mpe_g": 25.0, "status": "pass"},
        {"test_load_kg": 150, "indicated_kg": 150.02, "error_g": 20.0, "mpe_g": 50.0, "status": "pass"},
        {"test_load_kg": 300, "indicated_kg": 300.04, "error_g": 40.0, "mpe_g": 75.0, "status": "pass"}
      ]
    }'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'],
    28.4862, 77.0673,
    'pass',
    'Inspected using 50 kg Class M1 working standards. Verification certificate issued.',
    now() - interval '8 months',
    'synced',
    '90000000-0000-0000-0000-000000000002'
  ),

  -- 3. Failed Inspection for Fuel Dispenser in Pune
  (
    '70000000-0000-0000-0000-000000000003',
    'f0000000-0000-0000-0000-000000000004',
    'e0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000003',
    '{
      "meter_tamper_seal_broken": true,
      "totalizer_functioning": true,
      "hose_leakage": false
    }'::jsonb,
    '{
      "delivery_tests_5_litres": [
        {"run": 1, "dispensed_ml": 4920, "shortage_ml": 80, "max_allowed_error_ml": 25, "status": "fail"},
        {"run": 2, "dispensed_ml": 4915, "shortage_ml": 85, "max_allowed_error_ml": 25, "status": "fail"},
        {"run": 3, "dispensed_ml": 4910, "shortage_ml": 90, "max_allowed_error_ml": 25, "status": "fail"}
      ]
    }'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80'],
    18.5679, 73.9143,
    'fail',
    'FAILED: Delivering 85ml short per 5 Litres (Exceeds MPE of +/-25ml). Notice of Seizure issued under Sec 15 of LM Act 2009.',
    now() - interval '2 months',
    'synced',
    '90000000-0000-0000-0000-000000000003'
  )
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────
-- 6. VERIFICATION CERTIFICATES
-- ────────────────────────────────────────────────

INSERT INTO public.certificates (
  id, certificate_no, instrument_id, inspection_id, issued_by,
  issued_at, valid_till, pdf_url, signature_hash, is_revoked, revoked_reason
) VALUES
  -- 1. Valid certificate for Counter Scale (Sharma Sweets)
  (
    '80000000-0000-0000-0000-000000000001',
    'LMC-HR-GGN-2026-000001',
    'e0000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    now() - interval '6 months',
    now() + interval '6 months', -- valid for another 6 months
    'https://example.com/certificates/LMC-HR-GGN-2026-000001.pdf',
    -- SHA-256 HMAC digest
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    false,
    NULL
  ),

  -- 2. Valid certificate for Platform Scale (Sharma Dairy)
  (
    '80000000-0000-0000-0000-000000000002',
    'LMC-HR-GGN-2026-000002',
    'e0000000-0000-0000-0000-000000000002',
    '70000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    now() - interval '8 months',
    now() + interval '4 months',
    'https://example.com/certificates/LMC-HR-GGN-2026-000002.pdf',
    'f456c12898fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852f991',
    false,
    NULL
  ),

  -- 3. Expired certificate for Weighbridge in Pune (Expired 6 months ago)
  (
    '80000000-0000-0000-0000-000000000003',
    'LMC-MH-PUN-2026-000889',
    'e0000000-0000-0000-0000-000000000003',
    '70000000-0000-0000-0000-000000000001', -- reuse inspection FK
    'b0000000-0000-0000-0000-000000000003',
    now() - interval '18 months',
    now() - interval '6 months', -- EXPIRED!
    'https://example.com/certificates/LMC-MH-PUN-2026-000889.pdf',
    'f81376beac7c37d5e1032d21bbfa6d6da475451a302eaa2045bbf52292e8aad6',
    false,
    NULL
  ),

  -- 4. Expiring Soon Certificate (15 days remaining) for Mumbai Terminal
  (
    '80000000-0000-0000-0000-000000000004',
    'LMC-MH-MUM-2026-001204',
    'e0000000-0000-0000-0000-000000000008',
    '70000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000003',
    now() - interval '11 months' - interval '15 days',
    now() + interval '15 days', -- EXPIRING SOON!
    'https://example.com/certificates/LMC-MH-MUM-2026-001204.pdf',
    'b3c8033486aa1cd5d4df20565d5d1719deb14241aaa8e4707498b3c492874e55',
    false,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────
-- 7. CITIZEN COMPLAINTS
-- ────────────────────────────────────────────────

INSERT INTO public.complaints (
  id, complaint_no, instrument_id, citizen_name, citizen_contact,
  description, photo_url, status, assigned_officer_id, resolution_remarks, created_at
) VALUES
  -- 1. Assigned complaint on suspended scale in Faridabad
  (
    '99000000-0000-0000-0000-000000000001',
    'CMP-2026-000001',
    'e0000000-0000-0000-0000-000000000007',
    'Deepak Verma',
    '+91 98990 12345',
    'Shopkeeper placed a magnet beneath the pan causing a 60g offset on 1kg pulses.',
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80',
    'assigned',
    'b0000000-0000-0000-0000-000000000002',
    NULL,
    now() - interval '4 days'
  ),

  -- 2. Open complaint on expired weighbridge in Pune
  (
    '99000000-0000-0000-0000-000000000002',
    'CMP-2026-000002',
    'e0000000-0000-0000-0000-000000000003',
    'Kishore Deshmukh (Farmer)',
    '+91 94230 55667',
    'Soybean truck weight was recorded 420 kg less than standard APMC weighing station.',
    NULL,
    'open',
    'b0000000-0000-0000-0000-000000000003',
    NULL,
    now() - interval '2 days'
  ),

  -- 3. Resolved complaint on fuel pump in Pune (Prompted inspection & rejection)
  (
    '99000000-0000-0000-0000-000000000003',
    'CMP-2026-000003',
    'e0000000-0000-0000-0000-000000000005',
    'Pooja More',
    '+91 98231 44332',
    'Suspicious fuel dispenser delivery — mileage dropped significantly after fill-up.',
    NULL,
    'resolved',
    'b0000000-0000-0000-0000-000000000003',
    'Surprise inspection conducted on site. Short delivery verified (-85ml/5L). Dispenser sealed and seized.',
    now() - interval '2 months' - interval '5 days'
  )
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────
-- 8. GATC PATTERN APPROVAL TEST REPORTS
-- ────────────────────────────────────────────────

INSERT INTO public.test_reports (
  id, instrument_id, gatc_user_id, test_data, report_url, result, tested_at
) VALUES
  (
    'aa000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000005',
    '{
      "test_standard": "OIML R 76-1 (Non-automatic weighing instruments)",
      "temperature_range_celsius": [-10, 40],
      "creep_test_error_g": 0.5,
      "span_stability": "Passed",
      "emc_immunity_test": "Compliant (10 V/m, 80 MHz to 2 GHz)",
      "approval_number": "IND/09/2026/118"
    }'::jsonb,
    'https://example.com/reports/GATC-OIML-R76-DS215.pdf',
    'approved',
    now() - interval '14 months'
  ),
  (
    'aa000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000005',
    '{
      "test_standard": "OIML R 76-1 Class II High Accuracy",
      "thermal_drift_ppm": 2.1,
      "warmup_time_minutes": 15,
      "approval_number": "IND/01/2026/045"
    }'::jsonb,
    'https://example.com/reports/GATC-OIML-R76-NXT15.pdf',
    'approved',
    now() - interval '2 months'
  )
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────
-- 9. NOTIFICATIONS
-- ────────────────────────────────────────────────

INSERT INTO public.notifications (
  id, user_id, title, message, type, is_read, link, created_at
) VALUES
  -- Notification for Business Owner (Trader Sharma)
  (
    'bb000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000006',
    'Verification Scheduled',
    'Officer Vikram Singh has scheduled physical verification of your Electronic Scale (PHX-2026-00192) for this Thursday at 11:30 AM.',
    'info',
    false,
    '/applications',
    now() - interval '1 day'
  ),

  -- Expiry Alert for Trader Patil
  (
    'bb000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000007',
    'Legal Metrology Expiry Alert',
    'URGENT: Weighbridge (MT-WB-2021-9988) certificate expired on ' || to_char(now() - interval '6 months', 'DD Mon YYYY') || '. Commercial use is an offence under Sec 24 of LM Act 2009.',
    'alert',
    false,
    '/instruments',
    now() - interval '3 days'
  ),

  -- Officer notification (New assigned complaint)
  (
    'bb000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000002',
    'Citizen Complaint Assigned',
    'New complaint CMP-2026-000001 (Suspected Scale Tampering in NIT 1, Faridabad) has been assigned to your queue.',
    'warning',
    false,
    '/complaints',
    now() - interval '4 days'
  )
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────
-- 10. SYNC SEQUENCES WITH SEEDED VALUES
-- ────────────────────────────────────────────────
-- Update sequence tracking tables so future inserts don't collide.

INSERT INTO public.digital_id_sequences (district_code, year, last_value)
VALUES
  ('GGN', EXTRACT(YEAR FROM now())::integer, 4),
  ('PUN', EXTRACT(YEAR FROM now())::integer, 5),
  ('BLR', EXTRACT(YEAR FROM now())::integer, 6),
  ('FBD', EXTRACT(YEAR FROM now())::integer, 7),
  ('MUM', EXTRACT(YEAR FROM now())::integer, 8),
  ('LKN', EXTRACT(YEAR FROM now())::integer, 9),
  ('MYS', EXTRACT(YEAR FROM now())::integer, 10)
ON CONFLICT (district_code, year) DO UPDATE SET
  last_value = GREATEST(digital_id_sequences.last_value, EXCLUDED.last_value);

INSERT INTO public.application_no_sequences (district_code, year, last_value)
VALUES
  ('GGN', EXTRACT(YEAR FROM now())::integer, 5),
  ('PUN', EXTRACT(YEAR FROM now())::integer, 4)
ON CONFLICT (district_code, year) DO UPDATE SET
  last_value = GREATEST(application_no_sequences.last_value, EXCLUDED.last_value);

INSERT INTO public.certificate_no_sequences (district_code, year, last_value)
VALUES
  ('GGN', EXTRACT(YEAR FROM now())::integer, 2),
  ('PUN', EXTRACT(YEAR FROM now())::integer, 1),
  ('MUM', EXTRACT(YEAR FROM now())::integer, 1)
ON CONFLICT (district_code, year) DO UPDATE SET
  last_value = GREATEST(certificate_no_sequences.last_value, EXCLUDED.last_value);

INSERT INTO public.complaint_no_sequences (year, last_value)
VALUES
  (EXTRACT(YEAR FROM now())::integer, 3)
ON CONFLICT (year) DO UPDATE SET
  last_value = GREATEST(complaint_no_sequences.last_value, EXCLUDED.last_value);
