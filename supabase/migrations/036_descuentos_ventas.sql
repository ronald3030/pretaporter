-- ============================================================
-- 036_descuentos_ventas.sql
-- Permite al rol `ventas` validar y aplicar códigos de descuento
-- desde el punto de venta de tienda.
-- ============================================================

-- ── 1. SELECT: ventas puede leer códigos (para validar en caja) ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'codigos_descuento' AND policyname = 'ventas_read_codigos'
  ) THEN
    EXECUTE '
      CREATE POLICY "ventas_read_codigos"
        ON codigos_descuento FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN (''admin'', ''ventas'')
          )
        )
    ';
  END IF;
END;$$;

-- ── 2. Función: marcar código como usado desde venta de tienda ──
-- Versión sin orden_id (las ventas de tienda no están en `orders`).
-- SECURITY DEFINER garantiza el bypass de RLS para el UPDATE.
CREATE OR REPLACE FUNCTION fn_aplicar_codigo_tienda(
  p_codigo         TEXT,
  p_cliente_nombre TEXT DEFAULT NULL,
  p_cliente_email  TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  rows_updated  INT;
BEGIN
  -- Solo admin o ventas pueden llamar esta función
  SELECT role INTO v_caller_role
  FROM profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'ventas') THEN
    RAISE EXCEPTION 'Permiso denegado';
  END IF;

  UPDATE codigos_descuento
  SET
    usado            = true,
    usado_en         = now(),
    usado_por_nombre = p_cliente_nombre,
    usado_por_email  = p_cliente_email
  WHERE
    codigo   = UPPER(p_codigo)
    AND activo   = true
    AND usado    = false
    AND (fecha_fin IS NULL OR fecha_fin >= current_date);

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION fn_aplicar_codigo_tienda(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION fn_aplicar_codigo_tienda(TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================
-- FIN
-- Ejecutar en: https://supabase.com/dashboard/project/obijexmcqsgsjkrrftei/sql
-- ============================================================
