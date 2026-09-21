-- ============================================================
-- 007_phase11_risk_and_expiry.sql
-- LegalMet Verify — Phase 11: Risk Engine, Expiry Cron & Notifications
-- ============================================================

-- ────────────────────────────────────────────────
-- 1. ENHANCED RISK SCORING FUNCTION (M9 RULE-BASED)
-- ────────────────────────────────────────────────
-- Computes a 0-100 rule-based, transparent risk score per instrument.
-- STRICTLY RULE-BASED REGULATORY METROLOGY (NOT MACHINE LEARNING).
-- Factors:
--   1. Certificate expired:                      +40
--   2. Certificate expiring within 30 days:       +15
--   3. Open citizen complaints:                  +15 each (max 30)
--   4. Previous inspection failed:               +20
--   5. Never re-verified after 2+ years:         +15
--   6. Serial mismatch / tampering detected:     +25
-- Risk Bands: 0-30 LOW (green), 31-60 MEDIUM (amber), 61+ HIGH (red).

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
  v_complaints integer := 0;
  v_failed     boolean := false;
  v_mismatch   boolean := false;
  v_band       text;
BEGIN
  -- 1. Check latest certificate
  SELECT valid_till, is_revoked INTO v_cert
    FROM certificates
    WHERE instrument_id = p_instrument_id
      AND NOT is_revoked
    ORDER BY issued_at DESC
    LIMIT 1;

  -- Factor 1: Certificate expired (+40)
  IF v_cert IS NOT NULL AND v_cert.valid_till < now() THEN
    v_score := v_score + 40;
    v_factors := v_factors || jsonb_build_object(
      'factor', 'Certificate expired', 'points', 40
    );
  -- Factor 2: Certificate expiring within 30 days (+15)
  ELSIF v_cert IS NOT NULL AND v_cert.valid_till < now() + interval '30 days' THEN
    v_score := v_score + 15;
    v_factors := v_factors || jsonb_build_object(
      'factor', 'Certificate expiring within 30 days', 'points', 15
    );
  END IF;

  -- Factor 3: Open complaints (+15 each, max 30)
  SELECT count(*) INTO v_complaints
    FROM complaints
    WHERE instrument_id = p_instrument_id
      AND status IN ('open', 'assigned');

  IF v_complaints > 0 THEN
    v_score := v_score + LEAST(v_complaints * 15, 30);
    v_factors := v_factors || jsonb_build_object(
      'factor', v_complaints || ' open citizen complaint(s)',
      'points', LEAST(v_complaints * 15, 30)
    );
  END IF;

  -- Factor 4: Previous inspection failed (+20)
  SELECT EXISTS (
    SELECT 1 FROM inspections
    WHERE instrument_id = p_instrument_id AND result = 'fail'
  ) INTO v_failed;

  IF v_failed THEN
    v_score := v_score + 20;
    v_factors := v_factors || jsonb_build_object(
      'factor', 'Previous inspection failed calibration', 'points', 20
    );
  END IF;

  -- Factor 5: Never re-verified after 2+ years (+15)
  IF v_cert IS NULL THEN
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

  -- Factor 6: Serial mismatch / tampering previously detected (+25)
  SELECT EXISTS (
    SELECT 1 FROM inspections
    WHERE instrument_id = p_instrument_id
      AND (
        (checklist->>'serial_match')::boolean = false
        OR (checklist->>'serial_authentic')::boolean = false
        OR remarks ILIKE '%mismatch%'
        OR remarks ILIKE '%tamper%'
      )
  ) OR EXISTS (
    SELECT 1 FROM complaints
    WHERE instrument_id = p_instrument_id
      AND (
        description ILIKE '%mismatch%'
        OR description ILIKE '%serial%'
        OR description ILIKE '%seal broken%'
        OR description ILIKE '%tamper%'
      )
  ) INTO v_mismatch;

  IF v_mismatch THEN
    v_score := v_score + 25;
    v_factors := v_factors || jsonb_build_object(
      'factor', 'Serial mismatch / tampering previously detected', 'points', 25
    );
  END IF;

  -- Cap score at 100
  v_score := LEAST(v_score, 100);

  -- Determine risk band
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
-- 2. EXPIRY CRON & NOTIFICATION ENGINE (M10)
-- ────────────────────────────────────────────────
-- Evaluates certificates for T-30, T-15, and T-0 expiration thresholds.
-- Automatically marks instruments as expired when valid_till has passed.
-- Dispatches in-app notifications to business owners and district officers.

CREATE OR REPLACE FUNCTION process_expiry_alerts()
RETURNS jsonb AS $$
DECLARE
  v_record         RECORD;
  v_officer        RECORD;
  v_expired_count  integer := 0;
  v_notif_count    integer := 0;
  v_summary_count  integer := 0;
BEGIN
  -- A. Process Expired Certificates (T-0)
  FOR v_record IN
    SELECT c.id AS cert_id, c.certificate_no, c.valid_till,
           i.id AS instrument_id, i.digital_id, i.shop_name, i.district, i.state, i.owner_id
      FROM certificates c
      JOIN instruments i ON i.id = c.instrument_id
     WHERE c.valid_till < now()
       AND NOT c.is_revoked
  LOOP
    -- Auto-update instrument status to 'expired' if currently 'verified'
    UPDATE instruments
       SET status = 'expired', updated_at = now()
     WHERE id = v_record.instrument_id
       AND status = 'verified';

    IF FOUND THEN
      v_expired_count := v_expired_count + 1;
    END IF;

    -- Create T-0 Alert Notification for Owner (idempotent: max 1 per 7 days)
    IF v_record.owner_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM notifications
       WHERE user_id = v_record.owner_id
         AND title = 'Certificate EXPIRED — Reverification Required'
         AND link = '/business/certificates'
         AND created_at > now() - interval '7 days'
    ) THEN
      INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
      VALUES (
        v_record.owner_id,
        'Certificate EXPIRED — Reverification Required',
        'Verification certificate ' || v_record.certificate_no || ' for ' || v_record.shop_name || ' (' || v_record.digital_id || ') expired on ' || to_char(v_record.valid_till, 'DD Mon YYYY') || '. Continued commercial use is prohibited under Legal Metrology Act.',
        'alert',
        false,
        '/business/certificates',
        now()
      );
      v_notif_count := v_notif_count + 1;
    END IF;
  END LOOP;

  -- B. Process T-15 Days Expiring Soon (Warning)
  FOR v_record IN
    SELECT c.id AS cert_id, c.certificate_no, c.valid_till,
           i.id AS instrument_id, i.digital_id, i.shop_name, i.owner_id
      FROM certificates c
      JOIN instruments i ON i.id = c.instrument_id
     WHERE c.valid_till >= now()
       AND c.valid_till < now() + interval '15 days'
       AND NOT c.is_revoked
  LOOP
    IF v_record.owner_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM notifications
       WHERE user_id = v_record.owner_id
         AND title = 'Urgent: Certificate Expiring in 15 Days'
         AND link = '/business/certificates'
         AND created_at > now() - interval '7 days'
    ) THEN
      INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
      VALUES (
        v_record.owner_id,
        'Urgent: Certificate Expiring in 15 Days',
        'Certificate ' || v_record.certificate_no || ' for ' || v_record.shop_name || ' (' || v_record.digital_id || ') expires on ' || to_char(v_record.valid_till, 'DD Mon YYYY') || '. Submit re-verification now to avoid commercial suspension.',
        'warning',
        false,
        '/business/certificates',
        now()
      );
      v_notif_count := v_notif_count + 1;
    END IF;
  END LOOP;

  -- C. Process T-30 Days Expiring Soon (Info / Notice)
  FOR v_record IN
    SELECT c.id AS cert_id, c.certificate_no, c.valid_till,
           i.id AS instrument_id, i.digital_id, i.shop_name, i.owner_id
      FROM certificates c
      JOIN instruments i ON i.id = c.instrument_id
     WHERE c.valid_till >= now() + interval '15 days'
       AND c.valid_till < now() + interval '30 days'
       AND NOT c.is_revoked
  LOOP
    IF v_record.owner_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM notifications
       WHERE user_id = v_record.owner_id
         AND title = 'Certificate Expiring Soon (30 Days)'
         AND link = '/business/certificates'
         AND created_at > now() - interval '14 days'
    ) THEN
      INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
      VALUES (
        v_record.owner_id,
        'Certificate Expiring Soon (30 Days)',
        'Certificate ' || v_record.certificate_no || ' for ' || v_record.shop_name || ' (' || v_record.digital_id || ') will expire on ' || to_char(v_record.valid_till, 'DD Mon YYYY') || '. Please schedule on-site verification.',
        'info',
        false,
        '/business/certificates',
        now()
      );
      v_notif_count := v_notif_count + 1;
    END IF;
  END LOOP;

  -- D. District Officer Summary Digest Notifications
  FOR v_officer IN
    SELECT p.id, p.full_name, p.jurisdiction_district, p.jurisdiction_state
      FROM profiles p
     WHERE p.role = 'metrology_officer'
       AND p.is_active = true
       AND p.jurisdiction_district IS NOT NULL
  LOOP
    -- Count expiring or expired instruments in this officer's district
    SELECT count(*) INTO v_summary_count
      FROM instruments i
      JOIN certificates c ON c.instrument_id = i.id
     WHERE i.district = v_officer.jurisdiction_district
       AND c.valid_till < now() + interval '30 days'
       AND NOT c.is_revoked;

    IF v_summary_count > 0 AND NOT EXISTS (
      SELECT 1 FROM notifications
       WHERE user_id = v_officer.id
         AND title = 'Jurisdiction Expiry Digest: ' || v_officer.jurisdiction_district
         AND created_at > now() - interval '7 days'
    ) THEN
      INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
      VALUES (
        v_officer.id,
        'Jurisdiction Expiry Digest: ' || v_officer.jurisdiction_district,
        v_summary_count || ' instrument(s) in ' || v_officer.jurisdiction_district || ' have expired or are expiring within 30 days. Review pending verification queues.',
        'warning',
        false,
        '/officer/inspections',
        now()
      );
      v_notif_count := v_notif_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'expired_status_updated', v_expired_count,
    'notifications_dispatched', v_notif_count,
    'evaluated_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────
-- 3. MARK ALL NOTIFICATIONS AS READ RPC
-- ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE notifications
     SET is_read = true
   WHERE user_id = p_user_id
     AND is_read = false;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'marked_read', v_updated
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
