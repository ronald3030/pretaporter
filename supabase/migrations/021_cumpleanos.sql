-- ============================================================
-- 021_cumpleanos.sql
-- Fecha de nacimiento del cliente en caja (tienda) y web.
-- Se guarda en ventas_tienda / orders y se propaga a clientes.
-- ============================================================

-- ── 1. Columna en ventas_tienda ───────────────────────────────
ALTER TABLE ventas_tienda
  ADD COLUMN IF NOT EXISTS cliente_fecha_nacimiento DATE;

-- ── 2. Columna en orders (web) ────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cliente_fecha_nacimiento DATE;

-- ── 3. Columna en clientes (ya existe via 020, por si acaso) ──
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

-- ── 4. Actualizar fn_upsert_cliente para incluir birthday ─────
-- Reemplaza la función existente (015_clientes.sql) añadiendo
-- el parámetro p_fecha_nacimiento.
CREATE OR REPLACE FUNCTION fn_upsert_cliente(
  p_nombre            TEXT,
  p_telefono          TEXT,
  p_email             TEXT,
  p_monto             NUMERIC,
  p_fecha             TIMESTAMPTZ,
  p_canal             TEXT,           -- 'web' | 'tienda'
  p_fecha_nacimiento  DATE  DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_telefono IS NULL AND p_email IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO clientes (
    nombre, telefono, email,
    ultima_compra, total_compras, total_gastado,
    primer_canal, canales,
    fecha_nacimiento
  )
  VALUES (
    p_nombre,
    p_telefono,
    p_email,
    p_fecha,
    1,
    p_monto,
    p_canal,
    ARRAY[p_canal],
    p_fecha_nacimiento
  )
  ON CONFLICT (telefono) DO UPDATE SET
    nombre           = EXCLUDED.nombre,
    email            = COALESCE(EXCLUDED.email,            clientes.email),
    ultima_compra    = GREATEST(clientes.ultima_compra,    EXCLUDED.ultima_compra),
    total_compras    = clientes.total_compras + 1,
    total_gastado    = clientes.total_gastado + EXCLUDED.total_gastado,
    -- Solo actualizar birthday si se envía uno nuevo y el existente es NULL
    fecha_nacimiento = COALESCE(clientes.fecha_nacimiento, EXCLUDED.fecha_nacimiento),
    canales          = CASE
                         WHEN p_canal = ANY(clientes.canales) THEN clientes.canales
                         ELSE clientes.canales || ARRAY[p_canal]
                       END;
END;
$$;

-- ── 5. Trigger orders (web) — propaga birthday ────────────────
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
    'web',
    NEW.cliente_fecha_nacimiento   -- columna nueva
  );
  RETURN NEW;
END;
$$;

-- ── 6. Trigger ventas_tienda — propaga birthday ───────────────
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
    'tienda',
    NEW.cliente_fecha_nacimiento   -- columna nueva
  );
  RETURN NEW;
END;
$$;

-- ── 7. Índice cumpleaños mes (campañas) ───────────────────────
CREATE INDEX IF NOT EXISTS idx_clientes_cumple_mes
  ON clientes (EXTRACT(MONTH FROM fecha_nacimiento))
  WHERE fecha_nacimiento IS NOT NULL;

-- ============================================================
-- FIN
-- Ejecutar en: https://supabase.com/dashboard/project/obijexmcqsgsjkrrftei/sql
-- DEPENDENCIAS: 015_clientes.sql, 020_descuentos.sql
-- ============================================================
