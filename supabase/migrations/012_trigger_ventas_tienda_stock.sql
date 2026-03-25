-- ============================================================
-- 012_trigger_ventas_tienda_stock.sql
-- Trigger que descuenta stock automáticamente al insertar
-- una venta en tienda (ventas_tienda).
-- ============================================================

CREATE OR REPLACE FUNCTION fn_decrement_stock_tienda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item     JSONB;
  pid      UUID;
  sz       TEXT;
  qty      INTEGER;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    -- producto_id puede venir como "productoId" o "producto_id"
    pid := COALESCE(
      NULLIF(item->>'producto_id', ''),
      NULLIF(item->>'productoId',  '')
    )::UUID;
    sz  := item->>'talla';
    qty := COALESCE((item->>'cantidad')::INTEGER, 1);

    IF pid IS NULL THEN CONTINUE; END IF;

    IF sz = 'S' THEN
      UPDATE productos SET talla_s = GREATEST(0, talla_s - qty) WHERE id = pid;
    ELSIF sz = 'M' THEN
      UPDATE productos SET talla_m = GREATEST(0, talla_m - qty) WHERE id = pid;
    ELSIF sz = 'L' THEN
      UPDATE productos SET talla_l = GREATEST(0, talla_l - qty) WHERE id = pid;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_stock ON ventas_tienda;

CREATE TRIGGER trg_decrement_stock
  AFTER INSERT ON ventas_tienda
  FOR EACH ROW
  EXECUTE FUNCTION fn_decrement_stock_tienda();
