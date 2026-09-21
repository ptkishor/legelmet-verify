-- ============================================================
-- 003_functions.sql
-- LegalMet Verify — Audit Triggers & Helper Functions
-- ============================================================
-- Run this AFTER 002_rls.sql in the Supabase SQL Editor.
-- ============================================================

-- ────────────────────────────────────────────────
-- 1. GENERIC AUDIT TRIGGER FUNCTION
-- ────────────────────────────────────────────────
-- This one function handles INSERT, UPDATE, and DELETE
-- for any table. We attach it to each table we want audited.
--
-- SECURITY DEFINER means this function runs with the
-- privileges of the user who created it (superuser),
-- bypassing RLS on the audit_log table.

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_type text;
  v_entity_id   uuid;
  v_action      text;
  v_before      jsonb;
  v_after       jsonb;
BEGIN
  v_entity_type := TG_TABLE_NAME;
  v_action := TG_OP;

  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id;
    v_before := to_jsonb(OLD);
    v_after := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_entity_id := NEW.id;
    v_before := NULL;
    v_after := to_jsonb(NEW);
  ELSE -- UPDATE
    v_entity_id := NEW.id;
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
  END IF;

  INSERT INTO audit_log (entity_type, entity_id, action, actor_id, before, after)
  VALUES (
    v_entity_type,
    v_entity_id,
    v_action,
    auth.uid(),  -- NULL if called from a trigger with no auth context
    v_before,
    v_after
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────
-- 2. ATTACH AUDIT TRIGGERS TO KEY TABLES
-- ────────────────────────────────────────────────
-- We audit: instruments, applications, certificates
-- (the three tables mentioned in the spec as critical).

CREATE TRIGGER audit_instruments
  AFTER INSERT OR UPDATE OR DELETE ON instruments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_applications
  AFTER INSERT OR UPDATE OR DELETE ON applications
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_certificates
  AFTER INSERT OR UPDATE OR DELETE ON certificates
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ────────────────────────────────────────────────
-- 3. AUTO-ASSIGN COMPLAINT TO OFFICER
-- ────────────────────────────────────────────────
-- When a complaint is created, automatically assign it
-- to an active officer in the same district as the instrument.
-- If no officer is found in the district, try the state level.

CREATE OR REPLACE FUNCTION auto_assign_complaint()
RETURNS TRIGGER AS $$
DECLARE
  v_district text;
  v_state    text;
  v_officer  uuid;
BEGIN
  -- Get the instrument's location
  SELECT district, state INTO v_district, v_state
    FROM instruments WHERE id = NEW.instrument_id;

  -- Try to find an officer in the same district
  SELECT id INTO v_officer
    FROM profiles
    WHERE role = 'metrology_officer'
      AND is_active = true
      AND jurisdiction_state = v_state
      AND jurisdiction_district = v_district
    ORDER BY random()
    LIMIT 1;

  -- Fallback: any officer in the same state
  IF v_officer IS NULL THEN
    SELECT id INTO v_officer
      FROM profiles
      WHERE role = 'metrology_officer'
        AND is_active = true
        AND jurisdiction_state = v_state
      ORDER BY random()
      LIMIT 1;
  END IF;

  IF v_officer IS NOT NULL THEN
    NEW.assigned_officer_id := v_officer;
    NEW.status := 'assigned';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_complaints_auto_assign
  BEFORE INSERT ON complaints
  FOR EACH ROW
  WHEN (NEW.assigned_officer_id IS NULL)
  EXECUTE FUNCTION auto_assign_complaint();

-- ────────────────────────────────────────────────
-- 4. PROFILE CREATION ON SIGNUP
-- ────────────────────────────────────────────────
-- When a new user signs up via Supabase Auth, automatically
-- create a profile row. The role defaults to 'business_owner'.
-- Admins can change the role later.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    phone,
    role,
    jurisdiction_state,
    jurisdiction_district,
    designation
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'business_owner'
    ),
    NEW.raw_user_meta_data->>'jurisdiction_state',
    NEW.raw_user_meta_data->>'jurisdiction_district',
    NEW.raw_user_meta_data->>'designation'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    role = EXCLUDED.role,
    jurisdiction_state = COALESCE(EXCLUDED.jurisdiction_state, profiles.jurisdiction_state),
    jurisdiction_district = COALESCE(EXCLUDED.jurisdiction_district, profiles.jurisdiction_district),
    designation = COALESCE(EXCLUDED.designation, profiles.designation);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach to auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ────────────────────────────────────────────────
-- 5. RISK SCORE FUNCTION
-- ────────────────────────────────────────────────
-- Computes a 0-100 risk score for an instrument.
-- This is called from the frontend or via RPC.
-- It is rule-based and transparent — NOT machine learning.

CREATE OR REPLACE FUNCTION compute_risk_score(p_instrument_id uuid)
RETURNS TABLE (
  total_score  integer,
  risk_band    text,
  factors      jsonb
) AS $$
DECLARE
  v_score      integer := 0;
  v_factors    jsonb := '[]'::jsonb;
  v_cert       RECORD;
  v_complaints integer;
  v_failed     boolean;
  v_band       text;
BEGIN
  -- Check latest certificate
  SELECT valid_till, is_revoked INTO v_cert
    FROM certificates
    WHERE instrument_id = p_instrument_id
      AND NOT is_revoked
    ORDER BY issued_at DESC
    LIMIT 1;

  -- Factor: expired
  IF v_cert IS NOT NULL AND v_cert.valid_till < now() THEN
    v_score := v_score + 40;
    v_factors := v_factors || jsonb_build_object(
      'factor', 'Certificate expired', 'points', 40
    );
  -- Factor: expiring within 30 days
  ELSIF v_cert IS NOT NULL AND v_cert.valid_till < now() + interval '30 days' THEN
    v_score := v_score + 15;
    v_factors := v_factors || jsonb_build_object(
      'factor', 'Certificate expiring within 30 days', 'points', 15
    );
  END IF;

  -- Factor: open complaints (15 each, max 30)
  SELECT count(*) INTO v_complaints
    FROM complaints
    WHERE instrument_id = p_instrument_id
      AND status IN ('open', 'assigned');

  IF v_complaints > 0 THEN
    v_score := v_score + LEAST(v_complaints * 15, 30);
    v_factors := v_factors || jsonb_build_object(
      'factor', v_complaints || ' open complaint(s)',
      'points', LEAST(v_complaints * 15, 30)
    );
  END IF;

  -- Factor: previous inspection failed
  SELECT EXISTS (
    SELECT 1 FROM inspections
    WHERE instrument_id = p_instrument_id AND result = 'fail'
  ) INTO v_failed;

  IF v_failed THEN
    v_score := v_score + 20;
    v_factors := v_factors || jsonb_build_object(
      'factor', 'Previous inspection failed', 'points', 20
    );
  END IF;

  -- Factor: never re-verified after 2+ years
  IF v_cert IS NULL THEN
    -- Check if instrument is older than 2 years with no certificate
    IF EXISTS (
      SELECT 1 FROM instruments
      WHERE id = p_instrument_id
        AND created_at < now() - interval '2 years'
    ) THEN
      v_score := v_score + 15;
      v_factors := v_factors || jsonb_build_object(
        'factor', 'Never re-verified after 2+ years', 'points', 15
      );
    END IF;
  END IF;

  -- Cap at 100
  v_score := LEAST(v_score, 100);

  -- Determine band
  IF v_score <= 30 THEN
    v_band := 'LOW';
  ELSIF v_score <= 60 THEN
    v_band := 'MEDIUM';
  ELSE
    v_band := 'HIGH';
  END IF;

  RETURN QUERY SELECT v_score, v_band, v_factors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────
-- 6. PUBLIC VERIFY FUNCTION (RPC)
-- ────────────────────────────────────────────────
-- Called by the /verify/:digital_id page.
-- Returns instrument details + latest certificate + inspection history.
-- Accessible without login (uses anon key).

CREATE OR REPLACE FUNCTION get_instrument_verification(p_digital_id text)
RETURNS jsonb AS $$
DECLARE
  v_instrument  RECORD;
  v_certificate RECORD;
  v_inspections jsonb;
  v_result      jsonb;
BEGIN
  -- Get instrument
  SELECT * INTO v_instrument
    FROM instruments WHERE digital_id = p_digital_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- Get latest valid certificate
  SELECT * INTO v_certificate
    FROM certificates
    WHERE instrument_id = v_instrument.id
      AND NOT is_revoked
    ORDER BY issued_at DESC
    LIMIT 1;

  -- Get inspection history
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'inspected_at', ins.inspected_at,
    'result', ins.result,
    'officer_name', p.full_name,
    'remarks', ins.remarks
  ) ORDER BY ins.inspected_at DESC), '[]'::jsonb)
  INTO v_inspections
  FROM inspections ins
  JOIN profiles p ON p.id = ins.officer_id
  WHERE ins.instrument_id = v_instrument.id;

  v_result := jsonb_build_object(
    'found', true,
    'instrument', jsonb_build_object(
      'digital_id', v_instrument.digital_id,
      'category', v_instrument.category,
      'make', v_instrument.make,
      'model', v_instrument.model,
      'serial_no', v_instrument.serial_no,
      'capacity', v_instrument.capacity,
      'shop_name', v_instrument.shop_name,
      'address', v_instrument.address,
      'district', v_instrument.district,
      'state', v_instrument.state,
      'status', v_instrument.status,
      'nameplate_photo_url', v_instrument.nameplate_photo_url
    ),
    'certificate', CASE
      WHEN v_certificate IS NOT NULL THEN jsonb_build_object(
        'certificate_no', v_certificate.certificate_no,
        'issued_at', v_certificate.issued_at,
        'valid_till', v_certificate.valid_till,
        'pdf_url', v_certificate.pdf_url,
        'is_valid', v_certificate.valid_till > now()
      )
      ELSE NULL
    END,
    'inspections', v_inspections
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
