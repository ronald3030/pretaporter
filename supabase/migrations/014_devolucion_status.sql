-- ============================================================
-- 014_devolucion_status.sql
-- • Agrega 'devolucion' y 'cambio' como estados válidos en orders.
-- • Agrega columna status a ventas_tienda.
-- • Actualiza registrar_devolucion para cambiar el estado del origen.
-- ============================================================

-- 1. Ampliar constraint de orders
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','paid','delivered','cancelled','devolucion','cambio'));

-- 2. Agregar status a ventas_tienda (por defecto 'completada')
ALTER TABLE ventas_tienda
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completada';

ALTER TABLE ventas_tienda
  DROP CONSTRAINT IF EXISTS ventas_tienda_status_check;

ALTER TABLE ventas_tienda
  ADD CONSTRAINT ventas_tienda_status_check
  CHECK (status IN ('completada','devolucion','cambio'));

-- 3. Recrear registrar_devolucion con actualización de estado
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

  -- 2. Actualizar estado del origen
  IF p_orden_id IS NOT NULL THEN
    UPDATE orders SET status = p_tipo WHERE id = p_orden_id;
  END IF;
  IF p_venta_id IS NOT NULL THEN
    UPDATE ventas_tienda SET status = p_tipo WHERE id = p_venta_id;
  END IF;

  -- 3. Restaurar stock artículos devueltos
  FOR item IN SELECT * FROM jsonb_array_elements(p_items_devueltos)
  LOOP
    pid := COALESCE(NULLIF(item->>'productoId',''), NULLIF(item->>'producto_id',''))::UUID;
    sz  := item->>'talla';
    qty := COALESCE((item->>'cantidad')::INTEGER, 1);
    IF pid IS NULL THEN CONTINUE; END IF;
    IF    sz='S' THEN UPDATE productos SET talla_s = talla_s + qty WHERE id = pid;
    ELSIF sz='M' THEN UPDATE productos SET talla_m = talla_m + qty WHERE id = pid;
    ELSIF sz='L' THEN UPDATE productos SET talla_l = talla_l + qty WHERE id = pid;
    END IF;
  END LOOP;

  -- 4. Descontar stock artículos de cambio
  IF p_tipo = 'cambio' THEN
    FOR item IN SELECT * FROM jsonb_array_elements(p_items_cambio)
    LOOP
      pid := COALESCE(NULLIF(item->>'productoId',''), NULLIF(item->>'producto_id',''))::UUID;
      sz  := item->>'talla';
      qty := COALESCE((item->>'cantidad')::INTEGER, 1);
      IF pid IS NULL THEN CONTINUE; END IF;
      IF    sz='S' THEN UPDATE productos SET talla_s = GREATEST(0, talla_s - qty) WHERE id = pid;
      ELSIF sz='M' THEN UPDATE productos SET talla_m = GREATEST(0, talla_m - qty) WHERE id = pid;
      ELSIF sz='L' THEN UPDATE productos SET talla_l = GREATEST(0, talla_l - qty) WHERE id = pid;
      END IF;
    END LOOP;
  END IF;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION registrar_devolucion(UUID,UUID,UUID,TEXT,TEXT,JSONB,JSONB,NUMERIC,TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION registrar_devolucion(UUID,UUID,UUID,TEXT,TEXT,JSONB,JSONB,NUMERIC,TEXT) TO authenticated;
