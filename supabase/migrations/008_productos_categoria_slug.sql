-- ============================================================
-- 008_productos_categoria_slug.sql
-- Vincula cada producto con una categoría dinámica
-- ============================================================

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS categoria_slug TEXT
    REFERENCES categorias(slug)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS productos_categoria_slug_idx
  ON productos(categoria_slug);
