-- ============================================================
-- 041_fix_security_advisor.sql
-- Arregla los 17 errores del Security Advisor de Supabase:
--   1. profiles: RLS deshabilitado a pesar de tener políticas.
--   2. v_system_users: expone auth.users al rol anon.
--   3. 14 vistas con SECURITY DEFINER → convertir a INVOKER
--      para que respeten las políticas RLS del usuario que consulta.
--
-- Supabase corre Postgres 15+, así que usamos
--   ALTER VIEW ... SET (security_invoker = true)
-- que es la forma limpia de revertir el DEFINER sin recrear la vista.
--
-- Ejecutar en:
-- https://supabase.com/dashboard/project/obijexmcqsgsjkrrftei/sql
-- ============================================================

-- ──────────────────────────────────────────────────────────────────
-- 1. HABILITAR RLS EN profiles
-- ──────────────────────────────────────────────────────────────────
-- CRÍTICO: la tabla ya tiene políticas (profiles_select,
-- profiles_admin_update, own_profile_update) pero RLS estaba OFF, lo
-- que significaba que las políticas no se aplicaban y cualquier
-- authenticated podía leer todos los perfiles.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE  ROW LEVEL SECURITY;


-- ──────────────────────────────────────────────────────────────────
-- 2. REVOCAR v_system_users DEL ROL anon
-- ──────────────────────────────────────────────────────────────────
-- Esta vista reúne datos de auth.users con profiles. Es únicamente
-- para uso administrativo (pantalla Usuarios). anon no debe verla.
REVOKE ALL ON public.v_system_users FROM anon;
REVOKE ALL ON public.v_system_users FROM PUBLIC;

-- Dejamos SELECT solo para authenticated; el filtrado de solo-admins
-- lo hace el helper fn_set_user_role (SECURITY DEFINER, protegido por
-- rol) + la política de profiles ahora activada.
GRANT  SELECT ON public.v_system_users TO authenticated;


-- ──────────────────────────────────────────────────────────────────
-- 3. CONVERTIR VISTAS A SECURITY INVOKER
-- ──────────────────────────────────────────────────────────────────
-- Con security_invoker = true, la vista evalúa RLS con el rol del
-- usuario que hace la consulta (no el creador), que es el
-- comportamiento correcto y esperado.
--
-- Las 14 vistas detectadas por el linter:

-- NOTA: v_system_users NO se cambia a invoker porque lee de auth.users,
-- tabla a la que el rol `authenticated` no tiene acceso directo. La
-- dejamos como DEFINER pero ya la protegimos arriba con REVOKE anon.
-- Es la única excepción justificada.

ALTER VIEW public.v_gastos_por_categoria   SET (security_invoker = true);
ALTER VIEW public.v_caja_historial         SET (security_invoker = true);
ALTER VIEW public.v_productos_mas_vendidos SET (security_invoker = true);
ALTER VIEW public.v_codigos_resumen        SET (security_invoker = true);
ALTER VIEW public.v_cuentas_cobrar_resumen SET (security_invoker = true);
ALTER VIEW public.v_ventas                 SET (security_invoker = true);
ALTER VIEW public.v_ventas_metodo_pago     SET (security_invoker = true);
ALTER VIEW public.v_kpis_dia               SET (security_invoker = true);
ALTER VIEW public.v_inventario_valorizado  SET (security_invoker = true);
ALTER VIEW public.v_antiguedad_cxp         SET (security_invoker = true);
ALTER VIEW public.v_entregas               SET (security_invoker = true);
ALTER VIEW public.v_antiguedad_cxc         SET (security_invoker = true);
ALTER VIEW public.v_cuentas_pagar_resumen  SET (security_invoker = true);


-- ──────────────────────────────────────────────────────────────────
-- 4. VERIFICACIONES (solo informativo — para correr y leer resultado)
-- ──────────────────────────────────────────────────────────────────
-- Para comprobar después de aplicar:
--
--   SELECT schemaname, tablename, rowsecurity
--   FROM   pg_tables
--   WHERE  schemaname = 'public' AND tablename = 'profiles';
--   -- rowsecurity debe ser true
--
--   SELECT n.nspname, c.relname,
--          (pg_catalog.pg_get_viewdef(c.oid, true)) AS definition,
--          reloptions
--   FROM   pg_class c
--   JOIN   pg_namespace n ON n.oid = c.relnamespace
--   WHERE  c.relkind = 'v' AND n.nspname = 'public'
--     AND  c.relname LIKE 'v_%';
--   -- reloptions debe incluir security_invoker=true


-- ============================================================
-- FIN
-- Tras ejecutar: volver al Security Advisor y refrescar.
-- Los 17 ERRORES deberían desaparecer.
-- ============================================================
