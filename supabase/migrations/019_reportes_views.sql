-- ============================================================
-- 019_reportes_views.sql
-- Vistas y funciones auxiliares para el módulo de Reportes
-- del panel admin pret_admin (Flutter).
-- ============================================================

-- ── 1. VISTA: ventas unificadas (web + tienda) ───────────────
CREATE OR REPLACE VIEW v_ventas AS
  -- Órdenes web
  SELECT
    id,
    created_at                        AS fecha,
    'web'                             AS canal,
    customer_name                     AS cliente_nombre,
    customer_phone                    AS cliente_telefono,
    customer_email                    AS cliente_email,
    status,
    total_dop                         AS total,
    NULL::numeric                     AS monto_pagado,
    NULL::text                        AS forma_pago,
    COALESCE(jsonb_array_length(items), 0) AS num_items,
    items
  FROM orders

  UNION ALL

  -- Ventas en tienda
  SELECT
    id,
    created_at                        AS fecha,
    'tienda'                          AS canal,
    cliente_nombre,
    cliente_telefono,
    cliente_email,
    status,
    total_dop                         AS total,
    monto_pagado,
    forma_pago,
    COALESCE(jsonb_array_length(items), 0) AS num_items,
    items
  FROM ventas_tienda;

-- ── 2. VISTA: KPIs del dashboard ─────────────────────────────
CREATE OR REPLACE VIEW v_kpis_dia AS
WITH hoy AS (
  SELECT
    COALESCE(SUM(total), 0)        AS ventas_hoy,
    COUNT(*)                       AS transacciones_hoy
  FROM v_ventas
  WHERE fecha::date = current_date
    AND status NOT IN ('cancelled','devolucion','cambio')
),
mes AS (
  SELECT
    COALESCE(SUM(total), 0)        AS ventas_mes
  FROM v_ventas
  WHERE date_trunc('month', fecha) = date_trunc('month', now())
    AND status NOT IN ('cancelled','devolucion','cambio')
),
compras_mes AS (
  SELECT COALESCE(SUM(total), 0)   AS compras_mes
  FROM   compras
  WHERE  date_trunc('month', created_at) = date_trunc('month', now())
    AND  estado != 'cancelada'
),
gastos_mes AS (
  SELECT COALESCE(SUM(monto), 0)   AS gastos_mes
  FROM   gastos
  WHERE  date_trunc('month', fecha) = date_trunc('month', now())
),
cxc AS (
  SELECT
    COALESCE(SUM(monto - monto_pagado), 0)         AS saldo_cobrar,
    COUNT(*) FILTER (WHERE estado = 'vencida')     AS vencidas_cobrar
  FROM cuentas_cobrar
  WHERE estado != 'pagada'
),
cxp AS (
  SELECT
    COALESCE(SUM(total - monto_pagado), 0)         AS saldo_pagar,
    COUNT(*) FILTER (
      WHERE fecha_vencimiento < current_date)       AS vencidas_pagar
  FROM compras
  WHERE forma_pago != 'contado' AND monto_pagado < total
),
inv AS (
  SELECT
    COUNT(*) FILTER (
      WHERE talla_s + talla_m + talla_l = 0)        AS productos_agotados,
    COUNT(*) FILTER (
      WHERE talla_s + talla_m + talla_l BETWEEN 1 AND 5) AS productos_bajo_stock,
    COALESCE(SUM(precio * (talla_s + talla_m + talla_l)), 0) AS valor_inventario
  FROM productos WHERE activo = true
)
SELECT
  hoy.ventas_hoy,
  hoy.transacciones_hoy,
  mes.ventas_mes,
  compras_mes.compras_mes,
  gastos_mes.gastos_mes,
  cxc.saldo_cobrar,
  cxc.vencidas_cobrar,
  cxp.saldo_pagar,
  cxp.vencidas_pagar,
  inv.productos_agotados,
  inv.productos_bajo_stock,
  inv.valor_inventario,
  (mes.ventas_mes - compras_mes.compras_mes - gastos_mes.gastos_mes)
                                                   AS utilidad_estimada
FROM hoy, mes, compras_mes, gastos_mes, cxc, cxp, inv;

-- ── 3. VISTA: Ventas por método de pago (mes actual) ─────────
CREATE OR REPLACE VIEW v_ventas_metodo_pago AS
SELECT
  COALESCE(forma_pago, 'web/online') AS metodo,
  COUNT(*)                           AS transacciones,
  SUM(total)                         AS total
FROM v_ventas
WHERE date_trunc('month', fecha) = date_trunc('month', now())
  AND status NOT IN ('cancelled','devolucion','cambio')
GROUP BY 1
ORDER BY 3 DESC;

-- ── 4. VISTA: Productos más vendidos ─────────────────────────
CREATE OR REPLACE VIEW v_productos_mas_vendidos AS
WITH exploded AS (
  SELECT
    item->>'productoId'              AS producto_id,
    item->>'producto_id'             AS producto_id2,
    item->>'nombre'                  AS nombre,
    (item->>'cantidad')::int         AS cantidad,
    (item->>'precio')::numeric       AS precio,
    canal,
    fecha
  FROM v_ventas,
       jsonb_array_elements(items) AS item
  WHERE status NOT IN ('cancelled','devolucion','cambio')
)
SELECT
  COALESCE(nombre, producto_id, producto_id2, 'Desconocido') AS producto,
  SUM(cantidad)                                               AS unidades_vendidas,
  SUM(cantidad * precio)                                      AS monto_total
FROM exploded
GROUP BY 1
ORDER BY 2 DESC
LIMIT 20;

-- ── 5. VISTA: Antigüedad de cuentas por cobrar ───────────────
CREATE OR REPLACE VIEW v_antiguedad_cxc AS
SELECT
  id,
  cliente_nombre,
  monto,
  monto_pagado,
  (monto - monto_pagado)               AS saldo,
  fecha_vencimiento,
  (current_date - fecha_vencimiento)   AS dias_vencido,
  CASE
    WHEN estado = 'pagada'                              THEN 'Pagada'
    WHEN current_date <= fecha_vencimiento              THEN 'Vigente'
    WHEN current_date - fecha_vencimiento BETWEEN 1 AND 30   THEN '1–30 días'
    WHEN current_date - fecha_vencimiento BETWEEN 31 AND 60  THEN '31–60 días'
    WHEN current_date - fecha_vencimiento BETWEEN 61 AND 90  THEN '61–90 días'
    ELSE '+90 días'
  END                                   AS tramo,
  estado
FROM cuentas_cobrar;

-- ── 6. VISTA: Antigüedad de cuentas por pagar ────────────────
CREATE OR REPLACE VIEW v_antiguedad_cxp AS
SELECT
  c.id,
  COALESCE(p.nombre, 'Sin proveedor')   AS proveedor,
  c.numero_factura,
  c.total,
  c.monto_pagado,
  (c.total - c.monto_pagado)            AS saldo,
  c.fecha_vencimiento,
  (current_date - c.fecha_vencimiento)  AS dias_vencido,
  CASE
    WHEN c.monto_pagado >= c.total                                    THEN 'Pagada'
    WHEN c.fecha_vencimiento IS NULL                                  THEN 'Sin fecha'
    WHEN current_date <= c.fecha_vencimiento                          THEN 'Vigente'
    WHEN current_date - c.fecha_vencimiento BETWEEN 1 AND 30         THEN '1–30 días'
    WHEN current_date - c.fecha_vencimiento BETWEEN 31 AND 60        THEN '31–60 días'
    WHEN current_date - c.fecha_vencimiento BETWEEN 61 AND 90        THEN '61–90 días'
    ELSE '+90 días'
  END                                   AS tramo,
  c.forma_pago,
  c.estado
FROM compras c
LEFT JOIN proveedores p ON p.id = c.proveedor_id
WHERE c.forma_pago != 'contado';

-- ── 7. VISTA: Inventario valorizado ──────────────────────────
CREATE OR REPLACE VIEW v_inventario_valorizado AS
SELECT
  p.id,
  p.nombre,
  COALESCE(p.categoria_slug, p.categoria)           AS categoria,
  COALESCE(cat.nombre, p.categoria_slug, p.categoria) AS categoria_nombre,
  p.precio,
  p.talla_s,
  p.talla_m,
  p.talla_l,
  (p.talla_s + p.talla_m + p.talla_l)              AS total_unidades,
  p.precio * (p.talla_s + p.talla_m + p.talla_l)   AS valor_inventario,
  CASE
    WHEN p.talla_s + p.talla_m + p.talla_l = 0  THEN 'Agotado'
    WHEN p.talla_s + p.talla_m + p.talla_l <= 5 THEN 'Bajo stock'
    ELSE 'OK'
  END                                               AS estado_stock,
  p.activo,
  p.codigo_barras
FROM productos p
LEFT JOIN categorias cat
       ON cat.slug = COALESCE(p.categoria_slug, p.categoria);

-- ── 8. VISTA: Gastos por categoría (mes actual) ──────────────
CREATE OR REPLACE VIEW v_gastos_por_categoria AS
SELECT
  categoria,
  COUNT(*)             AS cantidad,
  SUM(monto)           AS total
FROM gastos
WHERE date_trunc('month', fecha) = date_trunc('month', now())
GROUP BY 1
ORDER BY 3 DESC;

-- ── 9. FUNCIÓN: Reporte estilo 607 (ventas para DGII) ────────
-- Solo aplica a ventas que tengan NCF. Por ahora agrupa ventas
-- del período para análisis. La DGII forma parte del RST para PAP.
CREATE OR REPLACE FUNCTION fn_reporte_607(
  p_desde DATE,
  p_hasta DATE
)
RETURNS TABLE(
  fecha          date,
  canal          text,
  cliente        text,
  telefono       text,
  total          numeric,
  itbis_estimado numeric,
  forma_pago     text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    v.fecha::date,
    v.canal,
    v.cliente_nombre,
    v.cliente_telefono,
    v.total,
    ROUND(v.total * 0.18, 2)  AS itbis_estimado,
    COALESCE(v.forma_pago, 'online')
  FROM v_ventas v
  WHERE v.fecha::date BETWEEN p_desde AND p_hasta
    AND v.status NOT IN ('cancelled','devolucion','cambio')
  ORDER BY v.fecha DESC;
$$;

-- ── 10. FUNCIÓN: Reporte estilo 606 (compras para DGII) ──────
CREATE OR REPLACE FUNCTION fn_reporte_606(
  p_desde DATE,
  p_hasta DATE
)
RETURNS TABLE(
  fecha          date,
  proveedor      text,
  rnc            text,
  numero_factura text,
  subtotal       numeric,
  itbis          numeric,
  total          numeric,
  forma_pago     text,
  estado         text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    c.fecha,
    COALESCE(p.nombre, 'Sin proveedor'),
    COALESCE(p.rnc, ''),
    COALESCE(c.numero_factura, ''),
    c.subtotal,
    c.itbis,
    c.total,
    c.forma_pago,
    c.estado
  FROM compras c
  LEFT JOIN proveedores p ON p.id = c.proveedor_id
  WHERE c.fecha BETWEEN p_desde AND p_hasta
    AND c.estado != 'cancelada'
  ORDER BY c.fecha DESC;
$$;

-- ── Permisos ─────────────────────────────────────────────────
-- Views: acceso a usuarios autenticados (admin verifica por RLS en tablas base)
GRANT SELECT ON v_ventas                  TO authenticated;
GRANT SELECT ON v_kpis_dia                TO authenticated;
GRANT SELECT ON v_ventas_metodo_pago      TO authenticated;
GRANT SELECT ON v_productos_mas_vendidos  TO authenticated;
GRANT SELECT ON v_antiguedad_cxc          TO authenticated;
GRANT SELECT ON v_antiguedad_cxp          TO authenticated;
GRANT SELECT ON v_inventario_valorizado   TO authenticated;
GRANT SELECT ON v_gastos_por_categoria    TO authenticated;

-- Functions
GRANT EXECUTE ON FUNCTION fn_reporte_607(date,date) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_reporte_606(date,date) TO authenticated;

-- ============================================================
-- FIN
-- Ejecutar en: https://supabase.com/dashboard/project/obijexmcqsgsjkrrftei/sql
-- IMPORTANTE: Ejecutar DESPUÉS de 018_compras_gastos_cuentas.sql
-- ============================================================
