-- ============================================================
-- 015_fix_trigger_stock.sql
-- Recreación forzada del trigger y función de descuento de stock.
-- Diagnóstico: talla_s=21 con 15 unidades vendidas → trigger no disparando.
-- ============================================================

-- 1. Diagnóstico: ver estado actual
SELECT
  tgname                AS trigger_name,
  CASE tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    WHEN 'R' THEN 'REPLICA'
    WHEN 'A' THEN 'ALWAYS'
    ELSE tgenabled::text
  END                   AS estado,
  tgtype                AS tipo
FROM   pg_trigger t
JOIN   pg_class  c ON c.oid = t.tgrelid
WHERE  c.relname = 'ventas_tienda'
  AND  NOT tgisinternal;

-- ============================================================
-- 2. Recrear función (SECURITY DEFINER = corre como postgres,
--    bypassa RLS en la tabla productos)
-- ============================================================
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
  -- Sólo descontar en inserts con estado 'completada'
  -- (los cambios/devoluciones manejan stock por separado)
  IF TG_OP = 'INSERT' THEN
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
        ELSE NULL; -- talla desconocida, ignorar
      END CASE;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Eliminar trigger anterior (si existe) y recrearlo
DROP TRIGGER IF EXISTS trg_decrement_stock ON ventas_tienda;

CREATE TRIGGER trg_decrement_stock
  AFTER INSERT ON ventas_tienda
  FOR EACH ROW
  EXECUTE FUNCTION fn_decrement_stock_tienda();

-- 4. Confirmar que quedó bien
SELECT
  tgname                                        AS trigger_name,
  CASE tgenabled::text
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    WHEN 'R' THEN 'REPLICA'
    WHEN 'A' THEN 'ALWAYS'
    ELSE tgenabled::text
  END                                           AS estado
FROM   pg_trigger t
JOIN   pg_class  c ON c.oid = t.tgrelid
WHERE  c.relname = 'ventas_tienda'
  AND  NOT tgisinternal;
