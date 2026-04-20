-- 031_fn_comparativa_productos.sql
-- Función RPC para comparativa de productos vendidos.
-- Consolida ventas en tienda (ventas_tienda) y órdenes web (orders)
-- agrupando por nombre de producto, con cantidad, ingresos y nº de transacciones.

CREATE OR REPLACE FUNCTION fn_comparativa_productos(
  p_desde DATE DEFAULT NULL,
  p_hasta DATE DEFAULT NULL
)
RETURNS TABLE(
  nombre      TEXT,
  cantidad    BIGINT,
  ingresos    NUMERIC,
  num_ordenes BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (

    -- ── Ventas en tienda (items: {nombre, precio, cantidad, talla}) ──────────
    SELECT
      COALESCE(item->>'nombre', '')                               AS nombre,
      COALESCE((item->>'cantidad')::int, 0)                      AS cantidad,
      COALESCE((item->>'precio')::numeric, 0)
        * COALESCE((item->>'cantidad')::int, 0)                  AS ingresos,
      v.id                                                        AS tx_id
    FROM  ventas_tienda v,
          jsonb_array_elements(v.items) AS item
    WHERE v.status = 'completada'
      AND jsonb_typeof(v.items) = 'array'
      AND (p_desde IS NULL OR v.created_at::date >= p_desde)
      AND (p_hasta IS NULL OR v.created_at::date <= p_hasta)

    UNION ALL

    -- ── Órdenes web (items: {name, priceNum, quantity, size}) ────────────────
    SELECT
      COALESCE(item->>'name', '')                                 AS nombre,
      COALESCE((item->>'quantity')::int, 0)                      AS cantidad,
      COALESCE((item->>'priceNum')::numeric, 0)
        * COALESCE((item->>'quantity')::int, 0)                  AS ingresos,
      o.id                                                        AS tx_id
    FROM  orders o,
          jsonb_array_elements(o.items) AS item
    WHERE o.status NOT IN ('cancelled', 'pending', 'devolucion')
      AND jsonb_typeof(o.items) = 'array'
      AND (p_desde IS NULL OR o.created_at::date >= p_desde)
      AND (p_hasta IS NULL OR o.created_at::date <= p_hasta)
  )
  SELECT
    nombre,
    SUM(cantidad)::bigint             AS cantidad,
    ROUND(SUM(ingresos), 2)           AS ingresos,
    COUNT(DISTINCT tx_id)::bigint     AS num_ordenes
  FROM  base
  WHERE nombre <> ''
  GROUP BY nombre
  ORDER BY SUM(cantidad) DESC;
$$;

-- Permisos: accesible para usuarios autenticados (admin usa service_role)
GRANT EXECUTE ON FUNCTION fn_comparativa_productos(DATE, DATE) TO authenticated;
