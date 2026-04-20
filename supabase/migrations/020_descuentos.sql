-- ============================================================
-- 020_descuentos.sql
-- Sistema de códigos de descuento de un solo uso para la web
-- + fecha de nacimiento en clientes para campañas.
-- ============================================================

-- ── 0. COLUMNAS DE DESCUENTO en orders ──────────────────────
-- Estas columnas almacenan el código aplicado al momento de la compra.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS codigo_descuento     TEXT,
  ADD COLUMN IF NOT EXISTS descuento_porcentaje NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS descuento_monto_dop  NUMERIC(12,2);

-- ── 1. FECHA DE NACIMIENTO en clientes ───────────────────────
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

-- Índice para filtrar cumpleaños del mes (campañas)
CREATE INDEX IF NOT EXISTS idx_clientes_cumple
  ON clientes(EXTRACT(MONTH FROM fecha_nacimiento))
  WHERE fecha_nacimiento IS NOT NULL;

-- ── 2. TABLA: codigos_descuento ───────────────────────────────
CREATE TABLE IF NOT EXISTS codigos_descuento (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ   NOT NULL    DEFAULT now(),

  -- Código (único, mayúsculas)
  codigo          TEXT          NOT NULL    UNIQUE,

  -- Descuento
  porcentaje      NUMERIC(5,2)  NOT NULL    CHECK (porcentaje > 0 AND porcentaje <= 100),

  -- Metadata
  descripcion     TEXT,
  fecha_inicio    DATE          DEFAULT current_date,
  fecha_fin       DATE,                            -- NULL = sin vencimiento
  monto_minimo    NUMERIC(12,2) DEFAULT 0,         -- mínimo de compra en DOP para aplicar
  activo          BOOLEAN       NOT NULL    DEFAULT true,

  -- Lote de generación (para agrupar codes creados juntos)
  batch_id        UUID,
  admin_notas     TEXT,

  -- Uso (un solo uso)
  usado           BOOLEAN       NOT NULL    DEFAULT false,
  usado_en        TIMESTAMPTZ,
  usado_por_nombre TEXT,
  usado_por_email  TEXT,
  orden_id        UUID          REFERENCES orders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_codigos_codigo   ON codigos_descuento(codigo);
CREATE INDEX IF NOT EXISTS idx_codigos_activo   ON codigos_descuento(activo, usado);
CREATE INDEX IF NOT EXISTS idx_codigos_batch    ON codigos_descuento(batch_id);
CREATE INDEX IF NOT EXISTS idx_codigos_fecha_fin ON codigos_descuento(fecha_fin)
  WHERE fecha_fin IS NOT NULL;

-- ── 3. RLS ───────────────────────────────────────────────────
ALTER TABLE codigos_descuento ENABLE  ROW LEVEL SECURITY;
ALTER TABLE codigos_descuento FORCE   ROW LEVEL SECURITY;

-- Admin: acceso total
CREATE POLICY "admin_manage_codigos"
  ON codigos_descuento FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Anon: puede validar código (solo lectura de campos mínimos necesarios).
-- La función server action usa service_role, así que esta política es
-- solo como fallback; el campo `usado` y `orden_id` no se exponen al cliente.
CREATE POLICY "anon_validate_codigo"
  ON codigos_descuento FOR SELECT TO anon
  USING (activo = true AND usado = false);

-- ── 4. FUNCIÓN: marcar código como usado (atómico) ───────────
-- Devuelve TRUE si se marcó, FALSE si ya estaba usado/inválido.
CREATE OR REPLACE FUNCTION fn_usar_codigo_descuento(
  p_codigo        TEXT,
  p_orden_id      UUID,
  p_cliente_nombre TEXT,
  p_cliente_email  TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_updated INT;
BEGIN
  UPDATE codigos_descuento
  SET
    usado            = true,
    usado_en         = now(),
    orden_id         = p_orden_id,
    usado_por_nombre = p_cliente_nombre,
    usado_por_email  = p_cliente_email
  WHERE
    codigo  = UPPER(p_codigo)
    AND activo  = true
    AND usado   = false
    AND (fecha_fin IS NULL OR fecha_fin >= current_date);

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION fn_usar_codigo_descuento(TEXT,UUID,TEXT,TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION fn_usar_codigo_descuento(TEXT,UUID,TEXT,TEXT) TO authenticated;
-- También al service_role (usado por las server actions de Next.js)
GRANT  EXECUTE ON FUNCTION fn_usar_codigo_descuento(TEXT,UUID,TEXT,TEXT) TO service_role;

-- ── 5. VISTA: resumen de códigos por batch ───────────────────
CREATE OR REPLACE VIEW v_codigos_resumen AS
SELECT
  batch_id,
  porcentaje,
  descripcion,
  fecha_fin,
  monto_minimo,
  activo,
  COUNT(*)                                           AS total_codigos,
  COUNT(*) FILTER (WHERE usado = false AND activo = true
    AND (fecha_fin IS NULL OR fecha_fin >= current_date)) AS disponibles,
  COUNT(*) FILTER (WHERE usado = true)               AS usados,
  MIN(created_at)                                    AS creado_en
FROM codigos_descuento
GROUP BY batch_id, porcentaje, descripcion, fecha_fin, monto_minimo, activo;

GRANT SELECT ON v_codigos_resumen TO authenticated;

-- ============================================================
-- FIN
-- Ejecutar en: https://supabase.com/dashboard/project/obijexmcqsgsjkrrftei/sql
-- ============================================================
