-- ============================================================
-- 037_precio_compra.sql
-- Añade precio de compra (costo) a la tabla productos.
-- El campo `precio` existente pasa a ser explícitamente el
-- precio de venta al público.
-- ============================================================

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS precio_compra NUMERIC(12,2) DEFAULT NULL;

COMMENT ON COLUMN productos.precio          IS 'Precio de venta al público (RD$)';
COMMENT ON COLUMN productos.precio_compra   IS 'Precio de compra / costo (RD$). Opcional, no visible en la tienda.';

-- ============================================================
-- FIN
-- Ejecutar en: https://supabase.com/dashboard/project/obijexmcqsgsjkrrftei/sql
-- ============================================================
