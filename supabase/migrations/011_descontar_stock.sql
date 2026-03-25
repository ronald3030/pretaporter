-- ============================================================
-- 011_descontar_stock.sql
-- Función RPC para descontar stock de productos por talla
-- cuando se confirma una venta desde la web.
-- ============================================================

CREATE OR REPLACE FUNCTION descontar_stock(p_items JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER   -- corre con permisos del dueño (service role)
AS $$
DECLARE
  item JSONB;
  pid  UUID;
  sz   TEXT;
  qty  INTEGER;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    pid := (item->>'productId')::UUID;
    sz  := item->>'size';
    qty := (item->>'quantity')::INTEGER;

    IF sz = 'S' THEN
      UPDATE productos
         SET talla_s = GREATEST(0, talla_s - qty)
       WHERE id = pid;

    ELSIF sz = 'M' THEN
      UPDATE productos
         SET talla_m = GREATEST(0, talla_m - qty)
       WHERE id = pid;

    ELSIF sz = 'L' THEN
      UPDATE productos
         SET talla_l = GREATEST(0, talla_l - qty)
       WHERE id = pid;
    END IF;
  END LOOP;
END;
$$;

-- Solo el service role puede ejecutar esta función
REVOKE ALL ON FUNCTION descontar_stock(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION descontar_stock(JSONB) TO service_role;
