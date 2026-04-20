-- ============================================================
-- 018_compras_gastos_cuentas.sql
-- Módulos de Proveedores, Compras, Gastos y Finanzas
-- para la app pret_admin (Flutter).
-- ============================================================

-- ── 1. PROVEEDORES ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS proveedores (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL    DEFAULT now(),
  nombre      TEXT        NOT NULL,
  contacto    TEXT,
  telefono    TEXT,
  email       TEXT,
  rnc         TEXT,
  direccion   TEXT,
  notas       TEXT,
  activo      BOOLEAN     NOT NULL    DEFAULT true
);

CREATE INDEX IF NOT EXISTS proveedores_nombre_idx ON proveedores(nombre);

ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores FORCE  ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_proveedores"
  ON proveedores FOR ALL TO authenticated
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

-- ── 2. COMPRAS ───────────────────────────────────────────────
-- Facturas de compra a proveedores.
-- forma_pago : 'contado' | 'credito15' | 'credito30'
-- estado     : 'pendiente' | 'recibida' | 'parcial' | 'cancelada'

CREATE TABLE IF NOT EXISTS compras (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  proveedor_id      UUID         REFERENCES proveedores(id) ON DELETE SET NULL,
  numero_factura    TEXT,
  fecha             DATE         NOT NULL DEFAULT current_date,
  fecha_entrega     DATE,
  items             JSONB        NOT NULL DEFAULT '[]',
  subtotal          NUMERIC(12,2) NOT NULL DEFAULT 0,
  itbis             NUMERIC(12,2) NOT NULL DEFAULT 0,
  total             NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado            TEXT         NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','recibida','parcial','cancelada')),
  forma_pago        TEXT         NOT NULL DEFAULT 'contado'
    CHECK (forma_pago IN ('contado','credito15','credito30')),
  fecha_vencimiento DATE,
  monto_pagado      NUMERIC(12,2) NOT NULL DEFAULT 0,
  notas             TEXT,
  admin_id          UUID         REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS compras_proveedor_idx  ON compras(proveedor_id);
CREATE INDEX IF NOT EXISTS compras_estado_idx     ON compras(estado);
CREATE INDEX IF NOT EXISTS compras_fecha_idx      ON compras(fecha DESC);
CREATE INDEX IF NOT EXISTS compras_forma_pago_idx ON compras(forma_pago);

-- Índice parcial: facturas de crédito con saldo pendiente (Supabase best-practices)
CREATE INDEX IF NOT EXISTS compras_credito_pendiente_idx
  ON compras(fecha_vencimiento)
  WHERE forma_pago != 'contado' AND monto_pagado < total;

ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras FORCE  ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_compras"
  ON compras FOR ALL TO authenticated
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

-- ── 3. GASTOS ────────────────────────────────────────────────
-- categoria: general | alquiler | servicios | nomina |
--            marketing | transporte | otro

CREATE TABLE IF NOT EXISTS gastos (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  concepto     TEXT          NOT NULL,
  monto        NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  categoria    TEXT          NOT NULL DEFAULT 'general'
    CHECK (categoria IN ('general','alquiler','servicios','nomina',
                         'marketing','transporte','otro')),
  fecha        DATE          NOT NULL DEFAULT current_date,
  proveedor_id UUID          REFERENCES proveedores(id) ON DELETE SET NULL,
  notas        TEXT,
  admin_id     UUID          REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS gastos_fecha_idx      ON gastos(fecha DESC);
CREATE INDEX IF NOT EXISTS gastos_categoria_idx  ON gastos(categoria);
CREATE INDEX IF NOT EXISTS gastos_proveedor_idx  ON gastos(proveedor_id);

ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos FORCE  ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_gastos"
  ON gastos FOR ALL TO authenticated
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

-- ── 4. CUENTAS POR COBRAR ────────────────────────────────────
-- Ventas a crédito (7 / 15 / 30 / 45 / 60 días).
-- estado: 'pendiente' | 'pagada' | 'vencida' | 'parcial'

CREATE TABLE IF NOT EXISTS cuentas_cobrar (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  cliente_nombre    TEXT          NOT NULL,
  cliente_telefono  TEXT,
  cliente_email     TEXT,
  monto             NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  monto_pagado      NUMERIC(12,2) NOT NULL DEFAULT 0,
  fecha_venta       DATE          NOT NULL DEFAULT current_date,
  fecha_vencimiento DATE          NOT NULL,
  estado            TEXT          NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','pagada','vencida','parcial')),
  items             JSONB         NOT NULL DEFAULT '[]',
  notas             TEXT,
  orden_id          UUID          REFERENCES orders(id)        ON DELETE SET NULL,
  venta_id          UUID          REFERENCES ventas_tienda(id) ON DELETE SET NULL,
  admin_id          UUID          REFERENCES auth.users(id)    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS cuentas_cobrar_estado_idx      ON cuentas_cobrar(estado);
CREATE INDEX IF NOT EXISTS cuentas_cobrar_vencimiento_idx ON cuentas_cobrar(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS cuentas_cobrar_cliente_idx     ON cuentas_cobrar(cliente_nombre);

-- Índice parcial: solo las que aún tienen saldo (las que realmente importan consultar)
CREATE INDEX IF NOT EXISTS cuentas_cobrar_pendientes_idx
  ON cuentas_cobrar(fecha_vencimiento)
  WHERE estado IN ('pendiente','parcial','vencida');

ALTER TABLE cuentas_cobrar ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas_cobrar FORCE  ROW LEVEL SECURITY;

-- Admin: acceso total
CREATE POLICY "admin_manage_cuentas_cobrar"
  ON cuentas_cobrar FOR ALL TO authenticated
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

-- Ventas: solo puede crear y leer (no eliminar)
CREATE POLICY "ventas_select_cuentas_cobrar"
  ON cuentas_cobrar FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'ventas'
    )
  );

CREATE POLICY "ventas_insert_cuentas_cobrar"
  ON cuentas_cobrar FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','ventas')
    )
  );

-- ── 5. FUNCIÓN: Marcar cuentas vencidas ──────────────────────
-- Puede ejecutarse desde un cron job (pg_cron) o desde la app.

CREATE OR REPLACE FUNCTION fn_actualizar_cuentas_vencidas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE cuentas_cobrar
  SET    estado = 'vencida'
  WHERE  estado IN ('pendiente', 'parcial')
    AND  fecha_vencimiento < current_date;
END;
$$;

REVOKE ALL  ON FUNCTION fn_actualizar_cuentas_vencidas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_actualizar_cuentas_vencidas() TO authenticated;

-- ── 6. VISTAS DE RESUMEN ─────────────────────────────────────

-- Por cobrar: saldo total pendiente
CREATE OR REPLACE VIEW v_cuentas_cobrar_resumen AS
SELECT
  COUNT(*)                                                       AS total,
  COALESCE(SUM(monto - monto_pagado), 0)                         AS saldo_total,
  COUNT(*) FILTER (WHERE estado = 'vencida')                     AS vencidas,
  COUNT(*) FILTER (
    WHERE fecha_vencimiento BETWEEN current_date AND current_date + 3
      AND estado IN ('pendiente','parcial'))                      AS proximas_a_vencer
FROM cuentas_cobrar
WHERE estado != 'pagada';

-- Por pagar: compras a crédito con saldo pendiente
CREATE OR REPLACE VIEW v_cuentas_pagar_resumen AS
SELECT
  COUNT(*)                                                       AS total,
  COALESCE(SUM(total - monto_pagado), 0)                         AS saldo_total,
  COUNT(*) FILTER (
    WHERE fecha_vencimiento < current_date
      AND monto_pagado < total)                                   AS vencidas
FROM compras
WHERE forma_pago != 'contado'
  AND monto_pagado < total;

-- ============================================================
-- FIN
-- Ejecutar en Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/obijexmcqsgsjkrrftei/sql
-- ============================================================
