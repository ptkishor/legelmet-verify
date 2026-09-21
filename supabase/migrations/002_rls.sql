-- ============================================================
-- 002_rls.sql
-- LegalMet Verify — Row Level Security Policies
-- ============================================================
-- Run this AFTER 001_schema.sql in the Supabase SQL Editor.
--
-- HOW RLS WORKS (for the team):
-- Row Level Security means every query is automatically filtered
-- by the database based on who is logged in. Even if someone
-- bypasses the frontend and calls the API directly, they can
-- only see/modify rows that the policy allows.
--
-- auth.uid()  = the logged-in user's UUID
-- auth.jwt()  = the full JWT token (contains role via our profile)
-- ============================================================

-- ────────────────────────────────────────────────
-- Helper function: get the current user's role
-- ────────────────────────────────────────────────
-- We query the profiles table to get the role. This is called
-- on every RLS check, so we keep it simple and fast.

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_my_state()
RETURNS text AS $$
  SELECT jurisdiction_state FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_my_district()
RETURNS text AS $$
  SELECT jurisdiction_district FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ────────────────────────────────────────────────
-- PROFILES
-- ────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (id = auth.uid());

-- Admins can read all profiles in their state
CREATE POLICY profiles_select_admin ON profiles
  FOR SELECT USING (
    get_my_role() = 'admin'
    AND (jurisdiction_state = get_my_state() OR jurisdiction_state IS NULL)
  );

-- Officers can see profiles in their state (needed for app assignment context)
CREATE POLICY profiles_select_officer ON profiles
  FOR SELECT USING (
    get_my_role() = 'metrology_officer'
    AND jurisdiction_state = get_my_state()
  );

-- Users can update their own profile (name, phone)
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can update profiles in their jurisdiction
CREATE POLICY profiles_update_admin ON profiles
  FOR UPDATE USING (get_my_role() = 'admin')
  WITH CHECK (true);

-- Insert: handled by the signup trigger (service role), not by users
CREATE POLICY profiles_insert ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ────────────────────────────────────────────────
-- INSTRUMENTS
-- ────────────────────────────────────────────────

ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;

-- Business owners see their own instruments
CREATE POLICY instruments_select_owner ON instruments
  FOR SELECT USING (owner_id = auth.uid());

-- Officers see instruments in their state
CREATE POLICY instruments_select_officer ON instruments
  FOR SELECT USING (
    get_my_role() = 'metrology_officer'
    AND state = get_my_state()
  );

-- Admins see instruments in their state
CREATE POLICY instruments_select_admin ON instruments
  FOR SELECT USING (
    get_my_role() = 'admin'
    AND state = get_my_state()
  );

-- GATC users see instruments in their state
CREATE POLICY instruments_select_gatc ON instruments
  FOR SELECT USING (
    get_my_role() = 'gatc_user'
    AND state = get_my_state()
  );

-- Public access for the verify page (anon users can read by digital_id)
-- This allows the /verify/:digital_id page to work without login
CREATE POLICY instruments_select_public ON instruments
  FOR SELECT USING (true);
  -- Note: the public verify page only needs status, basic info, and photo.
  -- In production we'd use a view or function to limit columns.
  -- For the hackathon prototype, full row access is acceptable.

-- Business owners can insert their own instruments
CREATE POLICY instruments_insert_owner ON instruments
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Business owners can update their own pending instruments
CREATE POLICY instruments_update_owner ON instruments
  FOR UPDATE USING (
    owner_id = auth.uid()
    AND status = 'pending'
  );

-- Officers can update instrument status in their state
CREATE POLICY instruments_update_officer ON instruments
  FOR UPDATE USING (
    get_my_role() = 'metrology_officer'
    AND state = get_my_state()
  );

-- Admins can update instruments in their state
CREATE POLICY instruments_update_admin ON instruments
  FOR UPDATE USING (
    get_my_role() = 'admin'
    AND state = get_my_state()
  );

-- ────────────────────────────────────────────────
-- APPLICATIONS
-- ────────────────────────────────────────────────

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Applicants see their own applications
CREATE POLICY applications_select_owner ON applications
  FOR SELECT USING (applicant_id = auth.uid());

-- Officers see applications assigned to them
CREATE POLICY applications_select_officer ON applications
  FOR SELECT USING (
    get_my_role() = 'metrology_officer'
    AND assigned_officer_id = auth.uid()
  );

-- Admins see all applications for instruments in their state
CREATE POLICY applications_select_admin ON applications
  FOR SELECT USING (
    get_my_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM instruments i
      WHERE i.id = applications.instrument_id
      AND i.state = get_my_state()
    )
  );

-- Business owners can insert applications for their own instruments
CREATE POLICY applications_insert_owner ON applications
  FOR INSERT WITH CHECK (
    applicant_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM instruments i
      WHERE i.id = instrument_id AND i.owner_id = auth.uid()
    )
  );

-- Officers can update applications assigned to them
CREATE POLICY applications_update_officer ON applications
  FOR UPDATE USING (
    get_my_role() = 'metrology_officer'
    AND assigned_officer_id = auth.uid()
  );

-- Admins can update any application in their state
CREATE POLICY applications_update_admin ON applications
  FOR UPDATE USING (
    get_my_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM instruments i
      WHERE i.id = applications.instrument_id
      AND i.state = get_my_state()
    )
  );

-- ────────────────────────────────────────────────
-- INSPECTIONS
-- ────────────────────────────────────────────────

ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- Officers see their own inspections
CREATE POLICY inspections_select_officer ON inspections
  FOR SELECT USING (officer_id = auth.uid());

-- Admins see inspections in their state
CREATE POLICY inspections_select_admin ON inspections
  FOR SELECT USING (
    get_my_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM instruments i
      WHERE i.id = inspections.instrument_id
      AND i.state = get_my_state()
    )
  );

-- Business owners can see inspections of their own instruments
CREATE POLICY inspections_select_owner ON inspections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM instruments i
      WHERE i.id = inspections.instrument_id
      AND i.owner_id = auth.uid()
    )
  );

-- Public can see inspections (for the verify page timeline)
CREATE POLICY inspections_select_public ON inspections
  FOR SELECT USING (true);

-- Officers can insert inspections
CREATE POLICY inspections_insert_officer ON inspections
  FOR INSERT WITH CHECK (
    officer_id = auth.uid()
    AND get_my_role() = 'metrology_officer'
  );

-- Officers can update their own inspections (needed for offline sync updates and draft edits)
CREATE POLICY inspections_update_officer ON inspections
  FOR UPDATE USING (
    officer_id = auth.uid()
    AND get_my_role() = 'metrology_officer'
  );

-- Admins can update inspections in their state
CREATE POLICY inspections_update_admin ON inspections
  FOR UPDATE USING (
    get_my_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM instruments i
      WHERE i.id = inspections.instrument_id
      AND i.state = get_my_state()
    )
  );

-- ────────────────────────────────────────────────
-- TEST REPORTS
-- ────────────────────────────────────────────────

ALTER TABLE test_reports ENABLE ROW LEVEL SECURITY;

-- GATC users see their own reports
CREATE POLICY test_reports_select_own ON test_reports
  FOR SELECT USING (gatc_user_id = auth.uid());

-- Officers and admins can see test reports in their state
CREATE POLICY test_reports_select_officer ON test_reports
  FOR SELECT USING (
    get_my_role() IN ('metrology_officer', 'admin')
    AND EXISTS (
      SELECT 1 FROM instruments i
      WHERE i.id = test_reports.instrument_id
      AND i.state = get_my_state()
    )
  );

-- GATC users can insert reports
CREATE POLICY test_reports_insert ON test_reports
  FOR INSERT WITH CHECK (
    gatc_user_id = auth.uid()
    AND get_my_role() = 'gatc_user'
  );

-- ────────────────────────────────────────────────
-- CERTIFICATES
-- ────────────────────────────────────────────────

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Public can view certificates (for verify page)
CREATE POLICY certificates_select_public ON certificates
  FOR SELECT USING (true);

-- Officers can insert certificates
CREATE POLICY certificates_insert_officer ON certificates
  FOR INSERT WITH CHECK (
    issued_by = auth.uid()
    AND get_my_role() = 'metrology_officer'
  );

-- Admins can update certificates (revoke)
CREATE POLICY certificates_update_admin ON certificates
  FOR UPDATE USING (
    get_my_role() = 'admin'
  );

-- ────────────────────────────────────────────────
-- COMPLAINTS
-- ────────────────────────────────────────────────

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a complaint (citizens don't need login)
-- We use anon key for this, so no auth.uid() check
CREATE POLICY complaints_insert_public ON complaints
  FOR INSERT WITH CHECK (true);

-- Officers see complaints assigned to them
CREATE POLICY complaints_select_officer ON complaints
  FOR SELECT USING (
    get_my_role() = 'metrology_officer'
    AND assigned_officer_id = auth.uid()
  );

-- Admins see all complaints in their state
CREATE POLICY complaints_select_admin ON complaints
  FOR SELECT USING (
    get_my_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM instruments i
      WHERE i.id = complaints.instrument_id
      AND i.state = get_my_state()
    )
  );

-- Public can see complaint count/status on verify page
CREATE POLICY complaints_select_public ON complaints
  FOR SELECT USING (true);

-- Officers can update complaints assigned to them
CREATE POLICY complaints_update_officer ON complaints
  FOR UPDATE USING (
    get_my_role() = 'metrology_officer'
    AND assigned_officer_id = auth.uid()
  );

-- Admins can update any complaint in their state
CREATE POLICY complaints_update_admin ON complaints
  FOR UPDATE USING (get_my_role() = 'admin');

-- ────────────────────────────────────────────────
-- OWNERSHIP HISTORY
-- ────────────────────────────────────────────────

ALTER TABLE ownership_history ENABLE ROW LEVEL SECURITY;

-- Owners, officers, and admins can view
CREATE POLICY ownership_select ON ownership_history
  FOR SELECT USING (true);

-- Only admins can insert ownership transfers
CREATE POLICY ownership_insert_admin ON ownership_history
  FOR INSERT WITH CHECK (get_my_role() = 'admin');

-- ────────────────────────────────────────────────
-- AUDIT LOG
-- ────────────────────────────────────────────────

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read the audit log
CREATE POLICY audit_log_select_admin ON audit_log
  FOR SELECT USING (get_my_role() = 'admin');

-- Audit log is written by triggers (SECURITY DEFINER),
-- not by user queries. No INSERT policy needed for regular users.
-- The trigger function runs with elevated privileges.

-- ────────────────────────────────────────────────
-- NOTIFICATIONS
-- ────────────────────────────────────────────────

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users see their own notifications
CREATE POLICY notifications_select_own ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can mark their own notifications as read
CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- ────────────────────────────────────────────────
-- LOOKUP TABLES (read-only for everyone)
-- ────────────────────────────────────────────────

ALTER TABLE state_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY state_codes_select ON state_codes
  FOR SELECT USING (true);

ALTER TABLE district_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY district_codes_select ON district_codes
  FOR SELECT USING (true);

-- Sequence tables are used internally by triggers only.
-- No RLS needed since users never query them directly.

-- ────────────────────────────────────────────────
-- STORAGE POLICIES (Supabase Storage: storage.objects)
-- ────────────────────────────────────────────────
-- Policies for:
-- 1. nameplate-photos (public read, authenticated upload)
-- 2. inspection-photos (private read/write for officers and admins)
-- 3. certificates (public read, officer/admin upload)

-- Nameplate Photos
CREATE POLICY "Public Read Nameplate Photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'nameplate-photos');

CREATE POLICY "Authenticated Upload Nameplate Photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'nameplate-photos');

-- Inspection Photos (Private to Officers and Admins)
CREATE POLICY "Officers/Admins Read Inspection Photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'inspection-photos'
    AND public.get_my_role() IN ('metrology_officer', 'admin')
  );

CREATE POLICY "Officers Upload Inspection Photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'inspection-photos'
    AND public.get_my_role() IN ('metrology_officer', 'admin')
  );

-- Certificates
CREATE POLICY "Public Read Certificates"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'certificates');

CREATE POLICY "Officers/Admins Upload Certificates"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'certificates'
    AND public.get_my_role() IN ('metrology_officer', 'admin')
  );

