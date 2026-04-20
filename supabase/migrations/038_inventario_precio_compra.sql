-- ============================================================
-- 038_inventario_precio_compra.sql
-- Agrega precio_compra a la vista v_inventario_valorizado
-- para que el reporte de inventario muestre P.Compra y P.Venta.
-- ============================================================

-- DROP primero: CREATE OR REPLACE no permite insertar columnas en medio
DROP VIEW IF EXISTS v_inventario_valorizado;

CREATE VIEW v_inventario_valorizado AS
SELECT
  p.id,
  p.nombre,
  COALESCE(p.categoria_slug, p.categoria)             AS categoria,
  COALESCE(cat.nombre, p.categoria_slug, p.categoria) AS categoria_nombre,
  p.precio,
  p.precio_compra,
  p.talla_s,
  p.talla_m,
  p.talla_l,
  (p.talla_s + p.talla_m + p.talla_l)                AS total_unidades,
  p.precio * (p.talla_s + p.talla_m + p.talla_l)     AS valor_inventario,
  CASE
    WHEN p.talla_s + p.talla_m + p.talla_l = 0  THEN 'Agotado'
    WHEN p.talla_s + p.talla_m + p.talla_l <= 5 THEN 'Bajo stock'
    ELSE 'OK'
  END                                                 AS estado_stock,
  p.activo,
  p.codigo_barras
FROM productos p
LEFT JOIN categorias cat
       ON cat.slug = COALESCE(p.categoria_slug, p.categoria);

GRANT SELECT ON v_inventario_valorizado TO authenticated;

-- ============================================================
-- FIN
-- Ejecutar en: https://supabase.com/dashboard/project/obijexmcqsgsjkrrftei/sql
-- ============================================================
