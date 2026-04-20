-- ============================================================
-- 024_orders_access_fix.sql
-- Garantiza que los usuarios autenticados (admin/ventas) puedan
-- leer y actualizar órdenes web desde el panel Flutter.
-- Sin esta política, las órdenes web son invisibles en el admin.
-- ============================================================

-- ── 1. Política SELECT para authenticated (admin panel) ──────
-- Migración 006 la crea, pero si no se aplicó, la creamos aquí.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orders'
      AND policyname = 'admin_select_orders'
  ) THEN
    EXECUTE '
      CREATE POLICY "admin_select_orders"
        ON orders FOR SELECT TO authenticated
        USING (true)
    ';
  END IF;
END;$$;

-- ── 2. Política UPDATE para authenticated ─────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orders'
      AND policyname = 'admin_update_orders'
  ) THEN
    EXECUTE '
      CREATE POLICY "admin_update_orders"
        ON orders FOR UPDATE TO authenticated
        USING (true)
    ';
  END IF;
END;$$;

-- ── 3. Política DELETE para admin (devoluciones, limpieza) ────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orders'
      AND policyname = 'admin_delete_orders'
  ) THEN
    EXECUTE '
      CREATE POLICY "admin_delete_orders"
        ON orders FOR DELETE TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = ''admin''
          )
        )
    ';
  END IF;
END;$$;

-- ── 4. Verificación rápida de políticas activas ───────────────
-- (Este SELECT no hace cambios, solo muestra el estado para diagnóstico)
SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- ============================================================
-- FIN
-- Ejecutar en: https://supabase.com/dashboard/project/obijexmcqsgsjkrrftei/sql
-- ============================================================
