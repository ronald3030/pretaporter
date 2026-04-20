-- ============================================================
-- 043_temporadas_foto_factura.sql
-- 1. Tabla temporadas (colecciones de temporada)
-- 2. Tabla producto_temporada (relación N:N)
-- 3. Columna foto_factura_url en compras
-- 4. Bucket de Storage para fotos de facturas
-- ============================================================

-- ── 1. Temporadas ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.temporadas (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       TEXT        NOT NULL,
  descripcion  TEXT,
  activo       BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.temporadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "temporadas_auth" ON public.temporadas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 2. Producto ↔ Temporada ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.producto_temporada (
  producto_id  UUID NOT NULL REFERENCES public.productos(id)   ON DELETE CASCADE,
  temporada_id UUID NOT NULL REFERENCES public.temporadas(id)  ON DELETE CASCADE,
  PRIMARY KEY (producto_id, temporada_id)
);

ALTER TABLE public.producto_temporada ENABLE ROW LEVEL SECURITY;

CREATE POLICY "producto_temporada_auth" ON public.producto_temporada
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 3. Foto de factura en compras ──────────────────────────────
ALTER TABLE public.compras
  ADD COLUMN IF NOT EXISTS foto_factura_url TEXT;

-- ── 4. Bucket para fotos de facturas ──────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'facturas',
  'facturas',
  false,
  10485760,   -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "facturas_read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'facturas');

CREATE POLICY "facturas_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'facturas');

CREATE POLICY "facturas_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'facturas');

-- ============================================================
-- FIN — Ejecutar en Supabase SQL Editor
-- ============================================================
