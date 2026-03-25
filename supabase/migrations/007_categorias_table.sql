-- ============================================================
-- 007_categorias_table.sql
-- Tabla de categorías gestionada desde el admin
-- ============================================================

CREATE TABLE categorias (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT         NOT NULL UNIQUE,
  slug       TEXT         NOT NULL UNIQUE,
  bg         TEXT         NOT NULL DEFAULT '#D8B7AF',
  orden      INTEGER      NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX categorias_orden_idx ON categorias(orden);

-- ── Seed: las 5 categorías actuales ─────────────────────────
INSERT INTO categorias (nombre, slug, bg, orden) VALUES
  ('Vestidos',        'vestidos',   '#D8B7AF', 0),
  ('Sets',            'sets',       '#C9B89A', 1),
  ('Blusas',          'blusas',     '#E4CFC9', 2),
  ('Pantalones',      'pantalones', '#C5AA90', 3),
  ('Nuevos Ingresos', 'nuevos',     '#B56F6A', 4);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE categorias ENABLE  ROW LEVEL SECURITY;
ALTER TABLE categorias FORCE   ROW LEVEL SECURITY;

-- Web (anon) puede leer todas
CREATE POLICY "public_read_categorias" ON categorias
  FOR SELECT TO anon USING (true);

-- Admin autenticado puede crear, editar y eliminar
CREATE POLICY "admin_manage_categorias" ON categorias
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
