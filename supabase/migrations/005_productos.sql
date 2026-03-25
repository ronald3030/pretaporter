-- ============================================================
-- 005_productos.sql
-- Tabla de productos del catálogo Prêt à Porter
-- ============================================================

CREATE TABLE productos (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ   NOT NULL    DEFAULT now(),
  nombre      TEXT          NOT NULL,
  descripcion TEXT,
  precio      NUMERIC(10,2) NOT NULL,
  categoria   TEXT          NOT NULL
                CHECK (categoria IN ('nueva_coleccion', 'novedades')),
  talla_s     INTEGER       NOT NULL DEFAULT 0 CHECK (talla_s >= 0),
  talla_m     INTEGER       NOT NULL DEFAULT 0 CHECK (talla_m >= 0),
  talla_l     INTEGER       NOT NULL DEFAULT 0 CHECK (talla_l >= 0),
  foto_url    TEXT,
  activo      BOOLEAN       NOT NULL DEFAULT true
);

CREATE INDEX productos_categoria_idx ON productos(categoria);
CREATE INDEX productos_activo_idx    ON productos(activo);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE  productos ENABLE  ROW LEVEL SECURITY;
ALTER TABLE  productos FORCE   ROW LEVEL SECURITY;

-- Público (web): sólo ve productos activos
CREATE POLICY "public_select_active" ON productos
  FOR SELECT TO anon
  USING (activo = true);

-- Admin autenticado: lee todo
CREATE POLICY "admin_select_all" ON productos
  FOR SELECT TO authenticated
  USING (true);

-- Admin autenticado: insertar
CREATE POLICY "admin_insert" ON productos
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Admin autenticado: actualizar
CREATE POLICY "admin_update" ON productos
  FOR UPDATE TO authenticated
  USING (true);

-- Admin autenticado: eliminar
CREATE POLICY "admin_delete" ON productos
  FOR DELETE TO authenticated
  USING (true);

-- ── Storage bucket para fotos de productos ───────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('productos', 'productos', true)
ON CONFLICT (id) DO NOTHING;

-- Lectura pública de imágenes
CREATE POLICY "storage_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'productos');

-- Solo autenticados pueden subir/actualizar/borrar imágenes
CREATE POLICY "storage_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'productos');

CREATE POLICY "storage_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'productos');

CREATE POLICY "storage_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'productos');
