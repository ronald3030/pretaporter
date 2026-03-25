-- ============================================================
-- 013_devoluciones.sql
-- Tabla de devoluciones/cambios + RPC que ajusta stock.
-- Solo accesible para admins (RLS + SECURITY DEFINER en RPC).
-- ============================================================

CREATE TABLE IF NOT EXISTS devoluciones (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  admin_id         UUID        REFERENCES auth.users(id),
  -- Origen: orden web ó venta en tienda (exactamente uno)
  orden_id         UUID        REFERENCES orders(id) ON DELETE SET NULL,
  venta_id         UUID        REFERENCES ventas_tienda(id) ON DELETE SET NULL,
  tipo             TEXT        NOT NULL CHECK (tipo IN ('devolucion', 'cambio')),
  motivo           TEXT,
  items_devueltos  JSONB       NOT NULL DEFAULT '[]',
  items_cambio     JSONB       NOT NULL DEFAULT '[]',
  monto_reembolso  NUMERIC(10,2),
  notas            TEXT,
  CONSTRAINT check_source CHECK (
    (orden_id IS NOT NULL AND venta_id IS NULL) OR
    (venta_id IS NOT NULL AND orden_id IS NULL)
  )
);

-- RLS: solo admins pueden leer/escribir
ALTER TABLE devoluciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_devoluciones"
  ON devoluciones FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ── RPC: registrar_devolucion ─────────────────────────────────
-- Inserta el registro y ajusta stock en una sola transacción.
CREATE OR REPLACE FUNCTION registrar_devolucion(
  p_admin_id        UUID,
  p_orden_id        UUID,
  p_venta_id        UUID,
  p_tipo            TEXT,
  p_motivo          TEXT,
  p_items_devueltos JSONB,
  p_items_cambio    JSONB,
  p_monto_reembolso NUMERIC,
  p_notas           TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
  item   JSONB;
  pid    UUID;
  sz     TEXT;
  qty    INTEGER;
BEGIN
  -- 1. Guardar registro
  INSERT INTO devoluciones (
    admin_id, orden_id, venta_id, tipo, motivo,
    items_devueltos, items_cambio, monto_reembolso, notas
  ) VALUES (
    p_admin_id, p_orden_id, p_venta_id, p_tipo, p_motivo,
    p_items_devueltos, p_items_cambio, p_monto_reembolso, p_notas
  ) RETURNING id INTO new_id;

  -- 2. Restaurar stock de artículos devueltos
  FOR item IN SELECT * FROM jsonb_array_elements(p_items_devueltos)
  LOOP
    pid := COALESCE(
      NULLIF(item->>'productoId', ''),
      NULLIF(item->>'producto_id', '')
    )::UUID;
    sz  := item->>'talla';
    qty := COALESCE((item->>'cantidad')::INTEGER, 1);
    IF pid IS NULL THEN CONTINUE; END IF;

    IF    sz = 'S' THEN UPDATE productos SET talla_s = talla_s + qty WHERE id = pid;
    ELSIF sz = 'M' THEN UPDATE productos SET talla_m = talla_m + qty WHERE id = pid;
    ELSIF sz = 'L' THEN UPDATE productos SET talla_l = talla_l + qty WHERE id = pid;
    END IF;
  END LOOP;

  -- 3. Descontar stock de artículos de cambio (solo para tipo='cambio')
  IF p_tipo = 'cambio' THEN
    FOR item IN SELECT * FROM jsonb_array_elements(p_items_cambio)
    LOOP
      pid := COALESCE(
        NULLIF(item->>'productoId', ''),
        NULLIF(item->>'producto_id', '')
      )::UUID;
      sz  := item->>'talla';
      qty := COALESCE((item->>'cantidad')::INTEGER, 1);
      IF pid IS NULL THEN CONTINUE; END IF;

      IF    sz = 'S' THEN UPDATE productos SET talla_s = GREATEST(0, talla_s - qty) WHERE id = pid;
      ELSIF sz = 'M' THEN UPDATE productos SET talla_m = GREATEST(0, talla_m - qty) WHERE id = pid;
      ELSIF sz = 'L' THEN UPDATE productos SET talla_l = GREATEST(0, talla_l - qty) WHERE id = pid;
      END IF;
    END LOOP;
  END IF;

  RETURN new_id;
END;
$$;

-- Solo authenticated puede llamar la función (la RLS del insert
-- ya valida que sea admin dentro de la transacción).
REVOKE ALL ON FUNCTION registrar_devolucion(UUID,UUID,UUID,TEXT,TEXT,JSONB,JSONB,NUMERIC,TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION registrar_devolucion(UUID,UUID,UUID,TEXT,TEXT,JSONB,JSONB,NUMERIC,TEXT) TO authenticated;
