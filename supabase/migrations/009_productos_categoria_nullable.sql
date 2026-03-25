-- ============================================================
-- 009_productos_categoria_nullable.sql
-- Hace que categoria sea nullable para productos que solo
-- aparecen en su página de categoría, no en secciones del home
-- ============================================================

-- Quitar el CHECK constraint existente
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_categoria_check;

-- Hacer la columna nullable
ALTER TABLE productos ALTER COLUMN categoria DROP NOT NULL;

-- Nuevo CHECK: permite NULL o los valores de sección
ALTER TABLE productos
  ADD CONSTRAINT productos_categoria_check
  CHECK (categoria IS NULL OR categoria IN ('nueva_coleccion', 'novedades'));
