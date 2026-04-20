-- ============================================================
-- 034_caja_sesiones.sql
-- Cuadre de caja diario:
--   • Apertura con monto inicial
--   • Movimientos manuales (ingresos/egresos extra)
--   • Cierre con arqueo físico vs saldo esperado
--   • Cálculo automático de saldo esperado en base a ventas
--     en efectivo registradas durante la sesión
-- ============================================================

-- ── 1. Sesiones de caja ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS caja_sesiones (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha                DATE          NOT NULL    DEFAULT current_date,

  -- Apertura
  apertura_at          TIMESTAMPTZ   NOT NULL    DEFAULT now(),
  apertura_usuario     UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  apertura_email       TEXT,
  monto_apertura       NUMERIC(12,2) NOT NULL    DEFAULT 0 CHECK (monto_apertura >= 0),
  notas_apertura       TEXT,

  -- Cierre (null si la sesión sigue abierta)
  cierre_at            TIMESTAMPTZ,
  cierre_usuario       UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  cierre_email         TEXT,
  monto_cierre_real    NUMERIC(12,2), -- conteo físico
  monto_cierre_esperado NUMERIC(12,2), -- calculado
  diferencia           NUMERIC(12,2), -- real - esperado (+ sobrante, - faltante)
  notas_cierre         TEXT,

  estado               TEXT          NOT NULL    DEFAULT 'abierta'
    CHECK (estado IN ('abierta','cerrada')),

  created_at           TIMESTAMPTZ   NOT NULL    DEFAULT now()
);

CREATE INDEX IF NOT EXISTS caja_sesiones_fecha_idx   ON caja_sesiones(fecha DESC);
CREATE INDEX IF NOT EXISTS caja_sesiones_estado_idx  ON caja_sesiones(estado);

-- Sólo una sesión abierta a la vez (índice parcial único)
CREATE UNIQUE INDEX IF NOT EXISTS caja_sesion_abierta_unica
  ON caja_sesiones((estado)) WHERE estado = 'abierta';

-- ── 2. Movimientos manuales de caja ──────────────────────────
-- Las ventas en efectivo se calculan directamente de ventas_tienda.
-- Esta tabla es para ingresos/egresos ADICIONALES (retiros,
-- inyecciones de efectivo, pagos en efectivo a proveedores, etc.)

CREATE TABLE IF NOT EXISTS caja_movimientos (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ   NOT NULL    DEFAULT now(),
  sesion_id       UUID          NOT NULL    REFERENCES caja_sesiones(id) ON DELETE CASCADE,
  tipo            TEXT          NOT NULL
    CHECK (tipo IN ('ingreso','egreso')),
  concepto        TEXT          NOT NULL,
  monto           NUMERIC(12,2) NOT NULL    CHECK (monto > 0),
  categoria       TEXT, -- 'gasto','retiro','inyeccion','pago_proveedor','otro'
  referencia_tipo TEXT, -- 'gasto','compra','manual'
  referencia_id   UUID,
  usuario_id      UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_email   TEXT,
  notas           TEXT
);

CREATE INDEX IF NOT EXISTS caja_mov_sesion_idx ON caja_movimientos(sesion_id);
CREATE INDEX IF NOT EXISTS caja_mov_tipo_idx   ON caja_movimientos(tipo);
CREATE INDEX IF NOT EXISTS caja_mov_fecha_idx  ON caja_movimientos(created_at DESC);

-- ── 3. RLS ────────────────────────────────────────────────────

ALTER TABLE caja_sesiones     ENABLE ROW LEVEL SECURITY;
ALTER TABLE caja_sesiones     FORCE  ROW LEVEL SECURITY;
ALTER TABLE caja_movimientos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE caja_movimientos  FORCE  ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_caja_sesiones"
  ON caja_sesiones FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','ventas')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','ventas')
    )
  );

CREATE POLICY "admin_manage_caja_movimientos"
  ON caja_movimientos FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','ventas')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','ventas')
    )
  );

-- ── 4. Función: calcular saldo esperado ──────────────────────
-- Fórmula: apertura + ventas_efectivo + ingresos_manuales - egresos_manuales

CREATE OR REPLACE FUNCTION fn_calcular_saldo_esperado(p_sesion_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_apertura       NUMERIC(12,2);
  v_apertura_at    TIMESTAMPTZ;
  v_cierre_at      TIMESTAMPTZ;
  v_estado         TEXT;
  v_ventas         NUMERIC(12,2) := 0;
  v_ingresos       NUMERIC(12,2) := 0;
  v_egresos        NUMERIC(12,2) := 0;
  v_hasta          TIMESTAMPTZ;
BEGIN
  SELECT monto_apertura, apertura_at, cierre_at, estado
    INTO v_apertura, v_apertura_at, v_cierre_at, v_estado
    FROM caja_sesiones
   WHERE id = p_sesion_id;

  IF v_apertura IS NULL THEN
    RAISE EXCEPTION 'Sesión % no encontrada', p_sesion_id;
  END IF;

  -- Si está cerrada, tope al cierre_at; si abierta, al now()
  v_hasta := COALESCE(v_cierre_at, now());

  -- Ventas en efectivo completadas durante la sesión
  SELECT COALESCE(SUM(total_dop), 0)
    INTO v_ventas
    FROM ventas_tienda
   WHERE forma_pago = 'efectivo'
     AND status = 'completada'
     AND created_at >= v_apertura_at
     AND created_at <= v_hasta;

  -- Movimientos manuales
  SELECT COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'), 0),
         COALESCE(SUM(monto) FILTER (WHERE tipo = 'egreso'),  0)
    INTO v_ingresos, v_egresos
    FROM caja_movimientos
   WHERE sesion_id = p_sesion_id;

  RETURN v_apertura + v_ventas + v_ingresos - v_egresos;
END;
$$;

REVOKE ALL ON FUNCTION fn_calcular_saldo_esperado(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_calcular_saldo_esperado(UUID) TO authenticated;

-- ── 5. Función: detalle de una sesión (para la pantalla) ─────

CREATE OR REPLACE FUNCTION fn_resumen_sesion_caja(p_sesion_id UUID)
RETURNS TABLE(
  monto_apertura     NUMERIC,
  ventas_efectivo    NUMERIC,
  ventas_tarjeta     NUMERIC,
  ventas_transferencia NUMERIC,
  ingresos_manuales  NUMERIC,
  egresos_manuales   NUMERIC,
  saldo_esperado     NUMERIC,
  num_ventas         BIGINT,
  num_movimientos    BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_apertura    NUMERIC;
  v_apertura_at TIMESTAMPTZ;
  v_cierre_at   TIMESTAMPTZ;
  v_hasta       TIMESTAMPTZ;
BEGIN
  SELECT cs.monto_apertura, cs.apertura_at, cs.cierre_at
    INTO v_apertura, v_apertura_at, v_cierre_at
    FROM caja_sesiones cs
   WHERE cs.id = p_sesion_id;

  v_hasta := COALESCE(v_cierre_at, now());

  RETURN QUERY
  SELECT
    v_apertura,
    (SELECT COALESCE(SUM(total_dop), 0) FROM ventas_tienda
      WHERE forma_pago = 'efectivo' AND status = 'completada'
        AND created_at BETWEEN v_apertura_at AND v_hasta),
    (SELECT COALESCE(SUM(total_dop), 0) FROM ventas_tienda
      WHERE forma_pago = 'tarjeta' AND status = 'completada'
        AND created_at BETWEEN v_apertura_at AND v_hasta),
    (SELECT COALESCE(SUM(total_dop), 0) FROM ventas_tienda
      WHERE forma_pago = 'transferencia' AND status = 'completada'
        AND created_at BETWEEN v_apertura_at AND v_hasta),
    (SELECT COALESCE(SUM(monto), 0) FROM caja_movimientos
      WHERE sesion_id = p_sesion_id AND tipo = 'ingreso'),
    (SELECT COALESCE(SUM(monto), 0) FROM caja_movimientos
      WHERE sesion_id = p_sesion_id AND tipo = 'egreso'),
    fn_calcular_saldo_esperado(p_sesion_id),
    (SELECT COUNT(*) FROM ventas_tienda
      WHERE forma_pago = 'efectivo' AND status = 'completada'
        AND created_at BETWEEN v_apertura_at AND v_hasta),
    (SELECT COUNT(*) FROM caja_movimientos WHERE sesion_id = p_sesion_id);
END;
$$;

REVOKE ALL ON FUNCTION fn_resumen_sesion_caja(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_resumen_sesion_caja(UUID) TO authenticated;

-- ── 6. Función: cerrar caja ──────────────────────────────────

CREATE OR REPLACE FUNCTION fn_cerrar_caja(
  p_sesion_id         UUID,
  p_monto_cierre_real NUMERIC,
  p_notas             TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_esperado  NUMERIC;
  v_diff      NUMERIC;
  v_user      UUID;
  v_email     TEXT;
BEGIN
  -- Sólo sesiones abiertas
  IF NOT EXISTS (
    SELECT 1 FROM caja_sesiones WHERE id = p_sesion_id AND estado = 'abierta'
  ) THEN
    RAISE EXCEPTION 'La sesión no está abierta o no existe';
  END IF;

  v_esperado := fn_calcular_saldo_esperado(p_sesion_id);
  v_diff     := p_monto_cierre_real - v_esperado;
  v_user     := auth.uid();

  IF v_user IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_user;
  END IF;

  UPDATE caja_sesiones
     SET cierre_at             = now(),
         cierre_usuario        = v_user,
         cierre_email          = v_email,
         monto_cierre_real     = p_monto_cierre_real,
         monto_cierre_esperado = v_esperado,
         diferencia            = v_diff,
         notas_cierre          = p_notas,
         estado                = 'cerrada'
   WHERE id = p_sesion_id;

  RETURN p_sesion_id;
END;
$$;

REVOKE ALL ON FUNCTION fn_cerrar_caja(UUID, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_cerrar_caja(UUID, NUMERIC, TEXT) TO authenticated;

-- ── 7. Vista de historial de cuadres ─────────────────────────

CREATE OR REPLACE VIEW v_caja_historial AS
SELECT
  cs.id,
  cs.fecha,
  cs.apertura_at,
  cs.apertura_email,
  cs.monto_apertura,
  cs.cierre_at,
  cs.cierre_email,
  cs.monto_cierre_real,
  cs.monto_cierre_esperado,
  cs.diferencia,
  cs.estado,
  CASE
    WHEN cs.diferencia IS NULL THEN NULL
    WHEN cs.diferencia = 0 THEN 'cuadrada'
    WHEN cs.diferencia > 0 THEN 'sobrante'
    ELSE 'faltante'
  END AS resultado
FROM caja_sesiones cs
ORDER BY cs.apertura_at DESC;

-- ============================================================
-- FIN
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================
