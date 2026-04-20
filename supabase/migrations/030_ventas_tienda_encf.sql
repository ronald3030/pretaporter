-- 030_ventas_tienda_encf.sql
-- Agrega la columna encf a ventas_tienda para almacenar el
-- Comprobante Fiscal Electrónico emitido a la DGII para cada venta.

ALTER TABLE ventas_tienda
  ADD COLUMN IF NOT EXISTS encf TEXT;

COMMENT ON COLUMN ventas_tienda.encf IS
  'e-NCF emitido a la DGII para esta venta (ej: B0200000001). Null si no se solicitó comprobante.';
