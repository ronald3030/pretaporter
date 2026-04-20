-- 026_orders_encf.sql
-- Añade campos de facturación electrónica (e-CF) a la tabla de órdenes web.
-- El e-NCF se emite desde la Edge Function `emitir-ecf` tras confirmar el pago.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS encf          TEXT,       -- B02XXXXXXXXXX
  ADD COLUMN IF NOT EXISTS ecf_track_id  TEXT,       -- Track ID devuelto por DGII
  ADD COLUMN IF NOT EXISTS ecf_estado    TEXT,       -- Aceptado / Rechazado / En proceso
  ADD COLUMN IF NOT EXISTS ecf_emitido_en TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_encf        ON orders (encf)        WHERE encf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_ecf_track   ON orders (ecf_track_id) WHERE ecf_track_id IS NOT NULL;
