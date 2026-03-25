-- ============================================================
-- 010_categorias_foto.sql
-- Agrega foto_url a la tabla categorias
-- ============================================================

ALTER TABLE categorias ADD COLUMN IF NOT EXISTS foto_url TEXT;
