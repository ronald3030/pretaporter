-- ============================================================
-- 032_inventario_movimientos.sql
-- Historial/auditoría de cambios en stock de productos.
-- Cada UPDATE a productos.talla_s/m/l registra una fila aquí,
-- con el origen del cambio (manual, compra, venta, devolución).
-- ============================================================

-- ── 1. Tabla de movimientos ──────────────────────────────────

CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ  NOT NULL    DEFAULT now(),
  producto_id       UUID         REFERENCES productos(id) ON DELETE CASCADE,
  producto_nombre   TEXT,
  tipo              TEXT         NOT NULL
    CHECK (tipo IN ('ajuste','compra','venta','devolucion','correccion','apertura')),
  talla             TEXT         NOT NULL
    CHECK (talla IN ('S','M','L','UNICA')),
  cantidad_antes    INTEGER      NOT NULL,
  cantidad_despues  INTEGER      NOT NULL,
  diferencia        INTEGER      NOT NULL, -- + incremento, - decremento
  referencia_tipo   TEXT, -- 'compra', 'venta_tienda', 'order', 'devolucion', 'manual'
  referencia_id     UUID,
  usuario_id        UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_email     TEXT,
  notas             TEXT
);

CREATE INDEX IF NOT EXISTS inv_mov_producto_idx ON inventario_movimientos(producto_id);
CREATE INDEX IF NOT EXISTS inv_mov_fecha_idx    ON inventario_movimientos(created_at DESC);
CREATE INDEX IF NOT EXISTS inv_mov_tipo_idx     ON inventario_movimientos(tipo);
CREATE INDEX IF NOT EXISTS inv_mov_ref_idx      ON inventario_movimientos(referencia_tipo, referencia_id);

ALTER TABLE inventario_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_movimientos FORCE  ROW LEVEL SECURITY;

-- Admin: lectura total, no permite edición/borrado (historial inmutable)
CREATE POLICY "admin_read_inventario_mov"
  ON inventario_movimientos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Sólo triggers con SECURITY DEFINER insertan aquí (no hay INSERT policy).

-- ── 2. Función de auditoría ──────────────────────────────────
-- Se dispara en UPDATE de productos cuando cambia talla_s/m/l.
-- Lee la variable de sesión `app.inv_source` para etiquetar el
-- origen del cambio. Si no viene, asume 'ajuste manual'.

CREATE OR REPLACE FUNCTION fn_log_inventario_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source    TEXT;
  v_tipo      TEXT := 'ajuste';
  v_ref_tipo  TEXT := 'manual';
  v_ref_id    UUID;
  v_usuario   UUID;
  v_email     TEXT;
BEGIN
  v_source := current_setting('app.inv_source', true);

  -- Formato esperado: 'compra:<uuid>' | 'venta_tienda:<uuid>' |
  --                   'order:<uuid>'  | 'devolucion:<uuid>'
  IF v_source IS NOT NULL AND v_source <> '' THEN
    IF v_source LIKE 'compra:%' THEN
      v_tipo := 'compra';
      v_ref_tipo := 'compra';
      v_ref_id := NULLIF(split_part(v_source, ':', 2), '')::UUID;
    ELSIF v_source LIKE 'venta_tienda:%' THEN
      v_tipo := 'venta';
      v_ref_tipo := 'venta_tienda';
      v_ref_id := NULLIF(split_part(v_source, ':', 2), '')::UUID;
    ELSIF v_source LIKE 'order:%' THEN
      v_tipo := 'venta';
      v_ref_tipo := 'order';
      v_ref_id := NULLIF(split_part(v_source, ':', 2), '')::UUID;
    ELSIF v_source LIKE 'devolucion:%' THEN
      v_tipo := 'devolucion';
      v_ref_tipo := 'devolucion';
      v_ref_id := NULLIF(split_part(v_source, ':', 2), '')::UUID;
    END IF;
  END IF;

  -- Captura usuario (puede ser null si viene por SECURITY DEFINER sin contexto)
  BEGIN
    v_usuario := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_usuario := NULL;
  END;

  IF v_usuario IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_usuario;
  END IF;

  IF OLD.talla_s IS DISTINCT FROM NEW.talla_s THEN
    INSERT INTO inventario_movimientos (
      producto_id, producto_nombre, tipo, talla,
      cantidad_antes, cantidad_despues, diferencia,
      referencia_tipo, referencia_id, usuario_id, usuario_email
    ) VALUES (
      NEW.id, NEW.nombre, v_tipo, 'S',
      OLD.talla_s, NEW.talla_s, NEW.talla_s - OLD.talla_s,
      v_ref_tipo, v_ref_id, v_usuario, v_email
    );
  END IF;

  IF OLD.talla_m IS DISTINCT FROM NEW.talla_m THEN
    INSERT INTO inventario_movimientos (
      producto_id, producto_nombre, tipo, talla,
      cantidad_antes, cantidad_despues, diferencia,
      referencia_tipo, referencia_id, usuario_id, usuario_email
    ) VALUES (
      NEW.id, NEW.nombre, v_tipo, 'M',
      OLD.talla_m, NEW.talla_m, NEW.talla_m - OLD.talla_m,
      v_ref_tipo, v_ref_id, v_usuario, v_email
    );
  END IF;

  IF OLD.talla_l IS DISTINCT FROM NEW.talla_l THEN
    INSERT INTO inventario_movimientos (
      producto_id, producto_nombre, tipo, talla,
      cantidad_antes, cantidad_despues, diferencia,
      referencia_tipo, referencia_id, usuario_id, usuario_email
    ) VALUES (
      NEW.id, NEW.nombre, v_tipo, 'L',
      OLD.talla_l, NEW.talla_l, NEW.talla_l - OLD.talla_l,
      v_ref_tipo, v_ref_id, v_usuario, v_email
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_inventario_changes ON productos;

CREATE TRIGGER trg_log_inventario_changes
  AFTER UPDATE ON productos
  FOR EACH ROW
  WHEN (OLD.talla_s IS DISTINCT FROM NEW.talla_s
     OR OLD.talla_m IS DISTINCT FROM NEW.talla_m
     OR OLD.talla_l IS DISTINCT FROM NEW.talla_l)
  EXECUTE FUNCTION fn_log_inventario_changes();

-- ── 3. Actualizar trigger de ventas_tienda para etiquetar origen ──

CREATE OR REPLACE FUNCTION fn_decrement_stock_tienda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item     JSONB;
  pid      UUID;
  sz       TEXT;
  qty      INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Etiqueta origen para que fn_log_inventario_changes lo registre como 'venta'
    PERFORM set_config('app.inv_source', 'venta_tienda:' || NEW.id::TEXT, true);

    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      pid := COALESCE(
               NULLIF(item->>'producto_id', ''),
               NULLIF(item->>'productoId',  '')
             )::UUID;
      sz  := UPPER(TRIM(item->>'talla'));
      qty := COALESCE((item->>'cantidad')::INTEGER, 1);

      IF pid IS NULL OR sz IS NULL THEN CONTINUE; END IF;

      CASE sz
        WHEN 'S' THEN UPDATE productos SET talla_s = GREATEST(0, talla_s - qty) WHERE id = pid;
        WHEN 'M' THEN UPDATE productos SET talla_m = GREATEST(0, talla_m - qty) WHERE id = pid;
        WHEN 'L' THEN UPDATE productos SET talla_l = GREATEST(0, talla_l - qty) WHERE id = pid;
        ELSE NULL;
      END CASE;
    END LOOP;

    -- Limpia para que no contamine otras operaciones en la misma transacción
    PERFORM set_config('app.inv_source', '', true);
  END IF;

  RETURN NEW;
END;
$$;

-- ── 4. Actualizar RPC descontar_stock (web orders) ───────────

CREATE OR REPLACE FUNCTION descontar_stock(p_items JSONB, p_order_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item JSONB;
  pid  UUID;
  sz   TEXT;
  qty  INTEGER;
BEGIN
  IF p_order_id IS NOT NULL THEN
    PERFORM set_config('app.inv_source', 'order:' || p_order_id::TEXT, true);
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    pid := COALESCE(
             NULLIF(item->>'productId', ''),
             NULLIF(item->>'producto_id', '')
           )::UUID;
    sz  := UPPER(TRIM(COALESCE(item->>'size', item->>'talla')));
    qty := COALESCE((item->>'quantity')::INTEGER, (item->>'cantidad')::INTEGER, 1);

    IF pid IS NULL OR sz IS NULL THEN CONTINUE; END IF;

    CASE sz
      WHEN 'S' THEN UPDATE productos SET talla_s = GREATEST(0, talla_s - qty) WHERE id = pid;
      WHEN 'M' THEN UPDATE productos SET talla_m = GREATEST(0, talla_m - qty) WHERE id = pid;
      WHEN 'L' THEN UPDATE productos SET talla_l = GREATEST(0, talla_l - qty) WHERE id = pid;
      ELSE NULL;
    END CASE;
  END LOOP;

  PERFORM set_config('app.inv_source', '', true);
END;
$$;

REVOKE ALL ON FUNCTION descontar_stock(JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION descontar_stock(JSONB, UUID) TO service_role, authenticated;

-- ── 5. RPC: anotar motivo en el último ajuste manual ─────────
-- Tras un UPDATE de productos, el trigger crea una fila por talla.
-- Esta RPC actualiza las notas del último ajuste para dejar trazabilidad.

CREATE OR REPLACE FUNCTION fn_anotar_motivo_ajuste(
  p_producto_id UUID,
  p_motivo      TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE inventario_movimientos
     SET notas = p_motivo
   WHERE id IN (
     SELECT id FROM inventario_movimientos
      WHERE producto_id = p_producto_id
        AND tipo = 'ajuste'
        AND (notas IS NULL OR notas = '')
      ORDER BY created_at DESC
      LIMIT 3 -- hasta 3 filas (S,M,L) del mismo ajuste
   );
END;
$$;

REVOKE ALL ON FUNCTION fn_anotar_motivo_ajuste(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_anotar_motivo_ajuste(UUID, TEXT) TO authenticated;

-- ============================================================
-- FIN — Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================
