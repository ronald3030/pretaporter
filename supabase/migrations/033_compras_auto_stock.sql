-- ============================================================
-- 033_compras_auto_stock.sql
-- Trigger que incrementa stock automáticamente cuando una compra
-- pasa a estado 'recibida'. Los items deben traer producto_id
-- y talla en el JSONB para vincularse al inventario.
-- ============================================================

-- Items de compra ahora soportan (opcionalmente):
--   { "producto_id": "<uuid>", "talla": "S|M|L|UNICA",
--     "nombre": "...", "cantidad": N, "precio_unitario": N }

CREATE OR REPLACE FUNCTION fn_aplicar_compra_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item      JSONB;
  pid       UUID;
  sz        TEXT;
  qty       INTEGER;
  aplicar   BOOLEAN := false;
BEGIN
  -- Determinar si hay que aplicar stock:
  -- INSERT directo con estado 'recibida', o UPDATE que cambia a 'recibida'
  IF TG_OP = 'INSERT' AND NEW.estado = 'recibida' THEN
    aplicar := true;
  ELSIF TG_OP = 'UPDATE'
    AND NEW.estado = 'recibida'
    AND OLD.estado IS DISTINCT FROM 'recibida' THEN
    aplicar := true;
  END IF;

  IF NOT aplicar THEN
    RETURN NEW;
  END IF;

  -- Etiqueta origen para el trigger de auditoría
  PERFORM set_config('app.inv_source', 'compra:' || NEW.id::TEXT, true);

  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    pid := NULLIF(item->>'producto_id', '')::UUID;
    sz  := UPPER(TRIM(COALESCE(item->>'talla', '')));
    qty := COALESCE((item->>'cantidad')::INTEGER, 0);

    -- Sólo procesar items vinculados a un producto y con cantidad > 0
    IF pid IS NULL OR qty <= 0 OR sz = '' THEN CONTINUE; END IF;

    CASE sz
      WHEN 'S' THEN UPDATE productos SET talla_s = talla_s + qty WHERE id = pid;
      WHEN 'M' THEN UPDATE productos SET talla_m = talla_m + qty WHERE id = pid;
      WHEN 'L' THEN UPDATE productos SET talla_l = talla_l + qty WHERE id = pid;
      ELSE NULL; -- UNICA u otras: no aplica por ahora (productos sólo tiene S/M/L)
    END CASE;
  END LOOP;

  PERFORM set_config('app.inv_source', '', true);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_aplicar_compra_stock ON compras;

CREATE TRIGGER trg_aplicar_compra_stock
  AFTER INSERT OR UPDATE OF estado ON compras
  FOR EACH ROW
  EXECUTE FUNCTION fn_aplicar_compra_stock();

-- ============================================================
-- FIN
-- ============================================================
