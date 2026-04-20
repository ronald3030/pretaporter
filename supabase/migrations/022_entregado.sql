-- ============================================================
-- 022_entregado.sql
-- Registro de entrega al cliente para órdenes web.
-- Cualquier usuario con rol admin o ventas puede marcarlo.
-- Se almacena quién lo marcó y cuándo para auditoría.
-- ============================================================

-- ── 1. Columnas de auditoría de entrega en orders ────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS entregado_en         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entregado_por_nombre TEXT,
  ADD COLUMN IF NOT EXISTS entregado_por_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notas_entrega        TEXT;

-- ── 2. Índice para filtrar órdenes entregadas por fecha ──────
CREATE INDEX IF NOT EXISTS idx_orders_entregado_en
  ON orders(entregado_en)
  WHERE entregado_en IS NOT NULL;

-- ── 3. Actualizar constraint de status si existe ─────────────
-- Supabase no siempre crea constraints en columna status,
-- pero si hay una hay que incluir 'entregado'.
DO $$
BEGIN
  -- Intenta añadir el nuevo status al check constraint si existe.
  -- Si no existe el constraint, no hace nada.
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'orders'
      AND constraint_name = 'orders_status_check'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_status_check;
    ALTER TABLE orders ADD CONSTRAINT orders_status_check
      CHECK (status IN (
        'pending', 'paid', 'delivered', 'entregado',
        'cancelled', 'devolucion', 'cambio'
      ));
  END IF;
END;
$$;

-- ── 4. Función RPC para marcar como entregado (atómico) ──────
-- Verifica que el usuario tiene rol admin o ventas antes de actualizar.
CREATE OR REPLACE FUNCTION fn_marcar_entregado(
  p_order_id    UUID,
  p_notas       TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id    UUID;
  v_user_name  TEXT;
  v_role       TEXT;
  v_result     JSONB;
BEGIN
  v_user_id := auth.uid();

  -- Verificar que el usuario tiene rol válido
  SELECT full_name, role
    INTO v_user_name, v_role
    FROM profiles
   WHERE id = v_user_id;

  IF v_role NOT IN ('admin', 'ventas') THEN
    RAISE EXCEPTION 'No tienes permiso para marcar órdenes como entregadas.';
  END IF;

  -- Actualizar la orden
  UPDATE orders
  SET
    status               = 'entregado',
    entregado_en         = now(),
    entregado_por_nombre = COALESCE(v_user_name, 'Usuario'),
    entregado_por_id     = v_user_id,
    notas_entrega        = p_notas
  WHERE id = p_order_id
    AND status NOT IN ('cancelled', 'entregado')
  RETURNING
    jsonb_build_object(
      'id',                   id,
      'status',               status,
      'entregado_en',         entregado_en,
      'entregado_por_nombre', entregado_por_nombre,
      'entregado_por_id',     entregado_por_id,
      'notas_entrega',        notas_entrega
    )
  INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'La orden no existe o ya fue cancelada/entregada.';
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION fn_marcar_entregado(UUID, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION fn_marcar_entregado(UUID, TEXT) TO authenticated;

-- ── 5. Vista: órdenes entregadas (para reportes) ─────────────
CREATE OR REPLACE VIEW v_entregas AS
SELECT
  o.id,
  o.created_at                          AS fecha_compra,
  o.customer_name,
  o.customer_phone,
  o.customer_email,
  o.address,
  o.shipping_method,
  o.shipping_zone,
  o.total_dop,
  o.status,
  o.entregado_en,
  o.entregado_por_nombre,
  o.notas_entrega,
  EXTRACT(EPOCH FROM (o.entregado_en - o.created_at)) / 3600
    AS horas_desde_compra
FROM orders o
WHERE o.entregado_en IS NOT NULL
ORDER BY o.entregado_en DESC;

GRANT SELECT ON v_entregas TO authenticated;

-- ============================================================
-- FIN
-- Ejecutar en: https://supabase.com/dashboard/project/obijexmcqsgsjkrrftei/sql
-- ============================================================
