-- ============================================================
-- 039_own_profile_update.sql
-- Permite a cualquier usuario autenticado actualizar SU PROPIO
-- perfil (full_name). No expone el cambio de `role` a usuarios
-- no-admin porque la columna `role` queda protegida por la
-- función SECURITY DEFINER `fn_set_user_role` (ver migración 035).
--
-- Necesaria para que las cajeras (rol 'ventas') puedan editar
-- su nombre desde la pantalla "Mi perfil" en la app pret_admin.
-- ============================================================

-- ── Política: cada usuario puede actualizar su propio perfil ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'own_profile_update'
  ) THEN
    EXECUTE '
      CREATE POLICY "own_profile_update"
        ON profiles FOR UPDATE TO authenticated
        USING      (id = auth.uid())
        WITH CHECK (id = auth.uid())
    ';
  END IF;
END;$$;

-- ── Trigger: impedir que un no-admin cambie su propio `role` ──
-- Protección defensiva: aunque la UI no expone ese campo, el
-- endpoint PATCH de PostgREST permitiría enviarlo. Este trigger
-- revierte cualquier cambio de role que no venga de un admin.
CREATE OR REPLACE FUNCTION fn_protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  -- Si el role no cambia, dejar pasar.
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  -- Si cambia el role, solo permitir si el que ejecuta es admin.
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'No tienes permiso para cambiar el rol';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION fn_protect_profile_role();

-- ============================================================
-- FIN
-- Ejecutar en: https://supabase.com/dashboard/project/obijexmcqsgsjkrrftei/sql
-- ============================================================
