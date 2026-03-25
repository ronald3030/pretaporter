-- ============================================================
-- 015_clientes.sql
-- Tabla clientes + triggers en orders y ventas_tienda.
-- Upsert automático al insertar una venta.
-- ============================================================

CREATE TABLE IF NOT EXISTS clientes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  nombre        TEXT        NOT NULL,
  telefono      TEXT        UNIQUE,          -- clave de deduplicación
  email         TEXT,
  ultima_compra TIMESTAMPTZ,
  total_compras INT         NOT NULL DEFAULT 0,
  total_gastado NUMERIC(12,2) NOT NULL DEFAULT 0,
  primer_canal  TEXT        CHECK (primer_canal IN ('web','tienda')),
  canales       TEXT[]      NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS clientes_telefono_idx ON clientes(telefono);
CREATE INDEX IF NOT EXISTS clientes_email_idx    ON clientes(email);

-- RLS: solo admins y ventas leen/escriben
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_clientes"
  ON clientes FOR ALL TO authenticated
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

-- ── Función compartida de upsert ─────────────────────────────
CREATE OR REPLACE FUNCTION fn_upsert_cliente(
  p_nombre   TEXT,
  p_telefono TEXT,
  p_email    TEXT,
  p_monto    NUMERIC,
  p_fecha    TIMESTAMPTZ,
  p_canal    TEXT          -- 'web' | 'tienda'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si no hay teléfono ni email no podemos identificar al cliente
  IF p_telefono IS NULL AND p_email IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO clientes (
    nombre, telefono, email,
    ultima_compra, total_compras, total_gastado,
    primer_canal, canales
  )
  VALUES (
    p_nombre,
    p_telefono,
    p_email,
    p_fecha,
    1,
    p_monto,
    p_canal,
    ARRAY[p_canal]
  )
  ON CONFLICT (telefono) DO UPDATE SET
    nombre        = EXCLUDED.nombre,
    email         = COALESCE(EXCLUDED.email, clientes.email),
    ultima_compra = GREATEST(clientes.ultima_compra, EXCLUDED.ultima_compra),
    total_compras = clientes.total_compras + 1,
    total_gastado = clientes.total_gastado + EXCLUDED.total_gastado,
    canales       = CASE
                      WHEN p_canal = ANY(clientes.canales) THEN clientes.canales
                      ELSE clientes.canales || ARRAY[p_canal]
                    END;
END;
$$;

-- ── Trigger: orders (web) ────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_cliente_desde_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM fn_upsert_cliente(
    NEW.customer_name,
    NEW.customer_phone,
    NEW.customer_email,
    NEW.total_dop,
    NEW.created_at,
    'web'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cliente_order ON orders;
CREATE TRIGGER trg_cliente_order
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_cliente_desde_order();

-- ── Trigger: ventas_tienda ────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_cliente_desde_venta_tienda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM fn_upsert_cliente(
    COALESCE(NEW.cliente_nombre, 'Cliente tienda'),
    NEW.cliente_telefono,
    NEW.cliente_email,
    NEW.total_dop,
    NEW.created_at,
    'tienda'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cliente_venta_tienda ON ventas_tienda;
CREATE TRIGGER trg_cliente_venta_tienda
  AFTER INSERT ON ventas_tienda
  FOR EACH ROW EXECUTE FUNCTION fn_cliente_desde_venta_tienda();

-- ── Restar gasto en devoluciones ─────────────────────────────
-- Actualiza total_gastado cuando se registra una devolución con reembolso
CREATE OR REPLACE FUNCTION fn_cliente_devolucion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_telefono TEXT;
  v_monto    NUMERIC;
BEGIN
  v_monto := COALESCE(NEW.monto_reembolso, 0);
  IF v_monto = 0 THEN RETURN NEW; END IF;

  -- Obtener teléfono del cliente desde la orden o venta origen
  IF NEW.orden_id IS NOT NULL THEN
    SELECT customer_phone INTO v_telefono
    FROM orders WHERE id = NEW.orden_id;
  ELSIF NEW.venta_id IS NOT NULL THEN
    SELECT cliente_telefono INTO v_telefono
    FROM ventas_tienda WHERE id = NEW.venta_id;
  END IF;

  IF v_telefono IS NOT NULL THEN
    UPDATE clientes
    SET total_gastado = GREATEST(0, total_gastado - v_monto)
    WHERE telefono = v_telefono;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cliente_devolucion ON devoluciones;
CREATE TRIGGER trg_cliente_devolucion
  AFTER INSERT ON devoluciones
  FOR EACH ROW EXECUTE FUNCTION fn_cliente_devolucion();
