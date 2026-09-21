-- ============================================================
-- 006_bulletproof_role_security.sql
-- 1. DROP the permissive profiles_update_own policy
-- 2. CREATE PostgreSQL trigger preventing ANY non-admin from changing roles
-- ============================================================

-- Step 1: Replace profiles_update_own policy
DROP POLICY IF EXISTS profiles_update_own ON profiles;

-- In Postgres UPDATE RLS, multiple policies for the same role are combined with OR.
-- So we MUST ensure profiles_update_admin requires get_my_role() = 'admin' for BOTH USING and WITH CHECK!
DROP POLICY IF EXISTS profiles_update_admin ON profiles;

CREATE POLICY profiles_update_admin ON profiles
  FOR UPDATE
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND (
      -- The new role must match the old role (immutable for self-update)
      role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
      OR get_my_role() = 'admin'
    )
  );

-- Step 2: BULLETPROOF TRIGGER LEVEL ENFORCEMENT
-- Triggers CANNOT be bypassed by RLS misconfigurations or policy ORs!
CREATE OR REPLACE FUNCTION public.enforce_profile_role_protection()
RETURNS TRIGGER AS $$
BEGIN
  -- If the role is being changed:
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Check if the updater is an admin or service_role
    -- If auth.uid() is null, it is service_role / internal system
    IF auth.uid() IS NOT NULL THEN
      -- If caller is authenticated, verify they are an admin
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ) THEN
        RAISE EXCEPTION 'Access Denied: You do not have permission to alter user roles.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;

CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_role_protection();
