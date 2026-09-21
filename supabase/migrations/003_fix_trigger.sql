-- ============================================================
-- 003_fix_trigger.sql: Fix handle_new_user trigger and anon RPC grants
-- ============================================================
-- Run this in the Supabase SQL Editor to resolve "Database error creating new user"
-- and allow public /verify queries.

-- 1. Grant schema permissions to supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO supabase_auth_admin;

-- 2. Drop and recreate handle_new_user with explicit search_path and schema-qualified types
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
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
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'business_owner'::public.user_role
    ),
    NEW.raw_user_meta_data->>'jurisdiction_state',
    NEW.raw_user_meta_data->>'jurisdiction_district',
    NEW.raw_user_meta_data->>'designation'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    role = EXCLUDED.role,
    jurisdiction_state = COALESCE(EXCLUDED.jurisdiction_state, public.profiles.jurisdiction_state),
    jurisdiction_district = COALESCE(EXCLUDED.jurisdiction_district, public.profiles.jurisdiction_district),
    designation = COALESCE(EXCLUDED.designation, public.profiles.designation);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Ensure get_instrument_verification has explicit anon & authenticated grants
GRANT EXECUTE ON FUNCTION public.get_instrument_verification(text) TO anon, authenticated, service_role;
