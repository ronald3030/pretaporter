-- Migration 016: Recalculate total_compras and total_gastado for all clientes.
--
-- Uses a UNION ALL approach to avoid FULL OUTER JOIN with complex conditions.
-- Normalises phone as the primary key (same logic as the triggers).

WITH compras AS (
  -- Web orders
  SELECT
    customer_phone  AS telefono,
    customer_email  AS email,
    total_dop
  FROM orders
  WHERE status NOT IN ('cancelled', 'devolucion', 'cambio')

  UNION ALL

  -- Tienda ventas
  SELECT
    cliente_telefono AS telefono,
    cliente_email    AS email,
    total_dop
  FROM ventas_tienda
  WHERE status = 'completada'
),
agregado AS (
  SELECT
    -- Prefer phone as the canonical identifier
    telefono,
    email,
    COUNT(*)       AS total_compras,
    SUM(total_dop) AS total_gastado
  FROM compras
  WHERE telefono IS NOT NULL OR email IS NOT NULL
  GROUP BY telefono, email
),
por_cliente AS (
  -- Sum across all rows that belong to the same clientes row
  SELECT
    c.id,
    SUM(a.total_compras) AS total_compras,
    SUM(a.total_gastado) AS total_gastado
  FROM clientes c
  JOIN agregado a
    ON (c.telefono IS NOT NULL AND c.telefono = a.telefono)
    OR (c.telefono IS NULL AND c.email IS NOT NULL AND c.email = a.email)
  GROUP BY c.id
)
UPDATE clientes c
SET
  total_compras = pc.total_compras,
  total_gastado = pc.total_gastado
FROM por_cliente pc
WHERE c.id = pc.id;
