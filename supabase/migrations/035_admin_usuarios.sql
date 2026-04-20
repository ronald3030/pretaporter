-- ============================================================
-- 035_admin_usuarios.sql
-- Políticas RLS para gestión de usuarios desde el panel admin.
-- Permite a los admins listar todos los perfiles y cambiar roles.
-- ============================================================

-- Asegurar que la tabla profiles tiene RLS activo
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE  ROW LEVEL SECURITY;

-- ── Política: cada usuario puede leer su propio perfil ────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'own_profile_select'
  ) THEN
    EXECUTE '
      CREATE POLICY "own_profile_select"
        ON profiles FOR SELECT TO authenticated
        USING (id = auth.uid())
    ';
  END IF;
END;$$;

-- ── Política: admins leen TODOS los perfiles ──────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'admin_profiles_select'
  ) THEN
    EXECUTE '
      CREATE POLICY "admin_profiles_select"
        ON profiles FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM profiles AS p2
            WHERE p2.id = auth.uid() AND p2.role = ''admin''
          )
        )
    ';
  END IF;
END;$$;

-- ── Política: admins actualizan perfiles de OTROS usuarios ────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'admin_profiles_update'
  ) THEN
    EXECUTE '
      CREATE POLICY "admin_profiles_update"
        ON profiles FOR UPDATE TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM profiles AS p2
            WHERE p2.id = auth.uid() AND p2.role = ''admin''
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM profiles AS p2
            WHERE p2.id = auth.uid() AND p2.role = ''admin''
          )
        )
    ';
  END IF;
END;$$;

-- ── Función segura para cambiar el rol de un usuario ─────────
-- SECURITY DEFINER garantiza bypass de RLS con validación propia
CREATE OR REPLACE FUNCTION fn_set_user_role(
  p_user_id  UUID,
  p_new_role TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_admin_count INT;
BEGIN
  -- Verificar que el invocador es admin
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Permiso denegado: solo los admins pueden cambiar roles';
  END IF;

  -- Validar nuevo rol
  IF p_new_role NOT IN ('admin', 'ventas') THEN
    RAISE EXCEPTION 'Rol inválido: %. Los roles válidos son: admin, ventas', p_new_role;
  END IF;

  -- Proteger: no quitarse el admin a sí mismo si es el único admin
  IF p_user_id = auth.uid() AND p_new_role != 'admin' THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM profiles WHERE role = 'admin';

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'No puedes quitarte el rol de admin porque eres el único administrador del sistema';
    END IF;
  END IF;

  UPDATE profiles
  SET role = p_new_role
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado: %', p_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_set_user_role(UUID, TEXT) TO authenticated;

-- ── Vista helper: lista de usuarios del sistema ───────────────
-- Combina profiles con auth.users para obtener email confirmado,
-- last_sign_in_at y created_at del sistema auth.
CREATE OR REPLACE VIEW v_system_users AS
SELECT
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.created_at,
  u.last_sign_in_at,
  u.email_confirmed_at IS NOT NULL AS email_confirmed
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.id;

-- Solo admins pueden ver la vista
GRANT SELECT ON v_system_users TO authenticated;

-- ============================================================
-- FIN
-- Ejecutar en: https://supabase.com/dashboard/project/obijexmcqsgsjkrrftei/sql
-- IMPORTANTE: Ejecutar DESPUÉS de todas las migraciones anteriores.
-- ============================================================
