-- ============================================================
-- 005_strict_role_security.sql
-- Prevent Privilege Escalation: Public Signups CANNOT set role
-- ============================================================

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
    'business_owner'::public.user_role, -- HARDCODED: ALWAYS business_owner, user metadata role is completely ignored
    NEW.raw_user_meta_data->>'jurisdiction_state',
    NEW.raw_user_meta_data->>'jurisdiction_district',
    NEW.raw_user_meta_data->>'designation'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    jurisdiction_state = COALESCE(EXCLUDED.jurisdiction_state, public.profiles.jurisdiction_state),
    jurisdiction_district = COALESCE(EXCLUDED.jurisdiction_district, public.profiles.jurisdiction_district),
    designation = COALESCE(EXCLUDED.designation, public.profiles.designation);
    -- Note: role is strictly immutable on signup conflict
  RETURN NEW;
END;
$$;

-- Also prevent regular users from updating their own role column in profiles
DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );
