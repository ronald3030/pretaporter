-- ============================================================
-- 042_fix_profiles_rls.sql
-- Corrige el error 500 causado por FORCE ROW LEVEL SECURITY
-- en la tabla profiles.
--
-- El problema: FORCE RLS + políticas que se referencian a sí
-- mismas (recursión infinita) → 500 Internal Server Error.
--
-- Solución: quitar FORCE RLS (mantener ENABLE RLS).
-- Con ENABLE RLS los usuarios autenticados siguen pasando por
-- las políticas; solo el superuser/service_role las saltea,
-- lo cual es el comportamiento correcto y seguro en Supabase.
-- ============================================================

-- Quitar FORCE (causa recursión), mantener ENABLE (seguridad)
ALTER TABLE public.profiles NO FORCE ROW LEVEL SECURITY;

-- Aseguramos que ENABLE siga activo
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Si no existe la política de lectura propia, crearla de forma segura
-- (sin recursión — solo compara auth.uid() con el id directo)
DO $$
BEGIN
  -- Política: cada usuario ve solo su propio perfil
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND policyname = 'profiles_select'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY profiles_select ON public.profiles
        FOR SELECT TO authenticated
        USING (id = auth.uid())
    $policy$;
  END IF;
END;
$$;

-- ============================================================
-- FIN — Ejecutar en:
-- https://supabase.com/dashboard/project/obijexmcqsgsjkrrftei/sql
-- ============================================================
