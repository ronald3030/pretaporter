-- ============================================================
-- 023_consistency_fixes.sql
-- Correcciones de consistencia detectadas en revisión de las
-- migraciones 001–022. Todos los pasos son idempotentes.
-- ============================================================

-- ============================================================
-- FIX 1: ventas_tienda — tabla base nunca definida en migrations
-- ============================================================
-- La tabla se creó manualmente en Supabase. Esta sección la crea
-- si no existe (para entornos nuevos) y añade columnas faltantes.

CREATE TABLE IF NOT EXISTS ventas_tienda (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  cliente_nombre           TEXT,
  cliente_telefono         TEXT,
  cliente_email            TEXT,
  items                    JSONB         NOT NULL DEFAULT '[]',
  total_dop                NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_pagado             NUMERIC(12,2) NOT NULL DEFAULT 0,
  cambio                   NUMERIC(12,2) NOT NULL DEFAULT 0,
  forma_pago               TEXT          NOT NULL DEFAULT 'efectivo',
  ncf                      TEXT,
  tipo_ncf                 TEXT,
  status                   TEXT          NOT NULL DEFAULT 'completada',
  codigo_descuento         TEXT,
  descuento_porcentaje     NUMERIC(5,2),
  descuento_monto_dop      NUMERIC(12,2),
  cliente_fecha_nacimiento DATE,
  -- vendedor_id: UUID del usuario (admin/ventas) que registró la venta
  -- El modelo Dart lo envía como 'vendedor_id' (no admin_id)
  vendedor_id              UUID          REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT ventas_tienda_status_check
    CHECK (status IN ('completada','devolucion','cambio'))
);

-- Columnas que pueden faltar en bases de datos existentes
ALTER TABLE ventas_tienda ADD COLUMN IF NOT EXISTS vendedor_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ventas_tienda ADD COLUMN IF NOT EXISTS codigo_descuento         TEXT;
ALTER TABLE ventas_tienda ADD COLUMN IF NOT EXISTS descuento_porcentaje     NUMERIC(5,2);
ALTER TABLE ventas_tienda ADD COLUMN IF NOT EXISTS descuento_monto_dop      NUMERIC(12,2);
ALTER TABLE ventas_tienda ADD COLUMN IF NOT EXISTS cliente_fecha_nacimiento DATE;
ALTER TABLE ventas_tienda ADD COLUMN IF NOT EXISTS ncf                      TEXT;
ALTER TABLE ventas_tienda ADD COLUMN IF NOT EXISTS tipo_ncf                 TEXT;
ALTER TABLE ventas_tienda ADD COLUMN IF NOT EXISTS cambio                   NUMERIC(12,2) NOT NULL DEFAULT 0;

-- RLS
ALTER TABLE ventas_tienda ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_tienda FORCE  ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ventas_tienda' AND policyname = 'staff_manage_ventas_tienda'
  ) THEN
    EXECUTE '
      CREATE POLICY "staff_manage_ventas_tienda"
        ON ventas_tienda FOR ALL TO authenticated
        USING (true) WITH CHECK (true)
    ';
  END IF;
END;$$;

CREATE INDEX IF NOT EXISTS idx_ventas_tienda_created   ON ventas_tienda(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_tienda_status    ON ventas_tienda(status);
CREATE INDEX IF NOT EXISTS idx_ventas_tienda_telefono  ON ventas_tienda(cliente_telefono);
CREATE INDEX IF NOT EXISTS idx_ventas_tienda_email     ON ventas_tienda(cliente_email);

-- ============================================================
-- FIX 2: productos.codigo_barras
-- ============================================================
-- 019_reportes_views.sql referencia p.codigo_barras en
-- v_inventario_valorizado. La columna nunca se creó en 005.
-- El sistema de etiquetas Zebra (pret_admin) también la necesita.

ALTER TABLE productos ADD COLUMN IF NOT EXISTS codigo_barras TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras
  ON productos(codigo_barras)
  WHERE codigo_barras IS NOT NULL;

-- ============================================================
-- FIX 3: orders — constraint de status unificado y completo
-- ============================================================
-- 001: check inline ('pending','paid','cancelled','delivered')
-- 014: drop+recreate como orders_status_check
--      agrega 'devolucion','cambio'
-- 022: intenta añadir 'entregado' con DO $$ condicional
-- Este FIX establece el estado final definitivo.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD  CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending', 'paid', 'delivered', 'entregado',
    'cancelled', 'devolucion', 'cambio'
  ));

-- ============================================================
-- FIX 4: FORCE ROW LEVEL SECURITY en tablas que lo omitieron
-- ============================================================
-- Nota: cuentas_pagar NO existe como tabla; las CxP se filtran
-- desde la tabla compras (via v_cuentas_pagar_resumen).
-- Solo aplicar FORCE en tablas que realmente existen.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'devoluciones', 'gastos', 'cuentas_cobrar',
    'codigos_descuento', 'compras', 'proveedores', 'ventas_tienda'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END;$$;

-- ============================================================
-- FIX 5: Políticas abiertas de nuevas_tablas.sql
-- ============================================================
-- nuevas_tablas.sql (pret_admin) creó políticas "staff_manage_*"
-- con USING(true) — cualquier usuario autenticado tiene acceso.
-- 018_compras_gastos_cuentas.sql creó políticas admin-only.
-- Las dos coexisten: la abierta gana, haciendo inútil la restrictiva.
-- SOLUCIÓN: eliminar las políticas abiertas para que solo queden
-- las políticas admin de 018.

-- DROP solo si la tabla existe (evita error si no se corrió nuevas_tablas)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='proveedores') THEN
    DROP POLICY IF EXISTS "staff_manage_proveedores" ON proveedores;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='compras') THEN
    DROP POLICY IF EXISTS "staff_manage_compras" ON compras;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='gastos') THEN
    DROP POLICY IF EXISTS "staff_manage_gastos" ON gastos;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cuentas_cobrar') THEN
    DROP POLICY IF EXISTS "staff_manage_cuentas_cobrar" ON cuentas_cobrar;
  END IF;
END;$$;

-- Asegurar que las políticas admin de 018 existen para gastos y cuentas_cobrar
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='gastos')
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'gastos' AND policyname = 'admin_manage_gastos'
  ) THEN
    EXECUTE '
      CREATE POLICY "admin_manage_gastos"
        ON gastos FOR ALL TO authenticated
        USING (EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN (''admin'',''ventas'')
        ))
        WITH CHECK (EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN (''admin'',''ventas'')
        ))
    ';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cuentas_cobrar')
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cuentas_cobrar' AND policyname = 'admin_manage_cuentas_cobrar'
  ) THEN
    EXECUTE '
      CREATE POLICY "admin_manage_cuentas_cobrar"
        ON cuentas_cobrar FOR ALL TO authenticated
        USING (EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN (''admin'',''ventas'')
        ))
        WITH CHECK (EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN (''admin'',''ventas'')
        ))
    ';
  END IF;
END;$$;

-- ============================================================
-- FIX 6: Storage — eliminar políticas duplicadas de 005
-- ============================================================
-- 005_productos.sql y 017_storage_rls_policies.sql crearon
-- políticas distintas para el mismo bucket 'productos'.
-- Eliminamos las de 005 (inglés) y dejamos las de 017 (español).
-- Las de 017 se recrean de forma idempotente por si acaso.

DROP POLICY IF EXISTS "storage_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "storage_auth_insert"  ON storage.objects;
DROP POLICY IF EXISTS "storage_auth_update"  ON storage.objects;
DROP POLICY IF EXISTS "storage_auth_delete"  ON storage.objects;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Lectura pública productos'
  ) THEN
    EXECUTE 'CREATE POLICY "Lectura pública productos"
      ON storage.objects FOR SELECT
      USING (bucket_id = ''productos'')';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Subida autenticada productos'
  ) THEN
    EXECUTE 'CREATE POLICY "Subida autenticada productos"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = ''productos'')';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Actualizar autenticado productos'
  ) THEN
    EXECUTE 'CREATE POLICY "Actualizar autenticado productos"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = ''productos'')';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Borrar autenticado productos'
  ) THEN
    EXECUTE 'CREATE POLICY "Borrar autenticado productos"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = ''productos'')';
  END IF;
END;$$;

-- ============================================================
-- FIX 7: Índice de cumpleaños duplicado
-- ============================================================
-- 020 creó idx_clientes_cumple
-- 021 creó idx_clientes_cumple_mes
-- Ambos indexan EXTRACT(MONTH FROM fecha_nacimiento).
-- Conservamos el de 021 (nombre más descriptivo) y eliminamos el de 020.

DROP INDEX IF EXISTS idx_clientes_cumple;

-- ============================================================
-- FIX 8: fn_usar_codigo_descuento — restringir a service_role
-- ============================================================
-- La función se usa exclusivamente desde Next.js con service_role.
-- No hay razón para exponerla a usuarios autenticados arbitrarios.

REVOKE EXECUTE ON FUNCTION fn_usar_codigo_descuento(TEXT, UUID, TEXT, TEXT)
  FROM authenticated;

GRANT EXECUTE ON FUNCTION fn_usar_codigo_descuento(TEXT, UUID, TEXT, TEXT)
  TO service_role;

-- ============================================================
-- FIX 9: Índices de rendimiento faltantes
-- ============================================================

-- orders: filtro por estado + fecha (reportes y dashboard)
CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON orders(status, created_at DESC);

-- orders: búsqueda por cliente (clientes_screen, historial)
CREATE INDEX IF NOT EXISTS idx_orders_customer_email
  ON orders(customer_email)
  WHERE customer_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_phone
  ON orders(customer_phone)
  WHERE customer_phone IS NOT NULL;

-- orders: campo entregado_en (queries de entregas)
CREATE INDEX IF NOT EXISTS idx_orders_entregado_en
  ON orders(entregado_en)
  WHERE entregado_en IS NOT NULL;

-- codigos_descuento: búsqueda rápida por código
CREATE INDEX IF NOT EXISTS idx_codigos_codigo
  ON codigos_descuento(codigo);

CREATE INDEX IF NOT EXISTS idx_codigos_activo_usado
  ON codigos_descuento(activo, usado)
  WHERE activo = true AND usado = false;

-- ============================================================
-- FIX 10: Recrear vistas que dependen de ventas_tienda
-- ============================================================
-- v_ventas y v_kpis_dia fallan si ventas_tienda no existía
-- cuando se corrió 019_reportes_views.sql.
-- Ahora que ventas_tienda existe (FIX 1), se recrean aquí.

CREATE OR REPLACE VIEW v_ventas AS
  -- Órdenes web (paid/delivered/entregado = ventas reales)
  SELECT
    id,
    created_at                             AS fecha,
    'web'                                  AS canal,
    customer_name                          AS cliente_nombre,
    customer_phone                         AS cliente_telefono,
    customer_email                         AS cliente_email,
    status,
    total_dop                              AS total,
    NULL::numeric                          AS monto_pagado,
    NULL::text                             AS forma_pago,
    COALESCE(jsonb_array_length(items), 0) AS num_items,
    items
  FROM orders

  UNION ALL

  -- Ventas en tienda
  SELECT
    id,
    created_at                             AS fecha,
    'tienda'                               AS canal,
    cliente_nombre,
    cliente_telefono,
    cliente_email,
    status,
    total_dop                              AS total,
    monto_pagado,
    forma_pago,
    COALESCE(jsonb_array_length(items), 0) AS num_items,
    items
  FROM ventas_tienda;

GRANT SELECT ON v_ventas TO authenticated;

-- v_kpis_dia también depende de v_ventas → recrear
CREATE OR REPLACE VIEW v_kpis_dia AS
WITH hoy AS (
  SELECT
    COALESCE(SUM(total), 0)   AS ventas_hoy,
    COUNT(*)                  AS transacciones_hoy
  FROM v_ventas
  WHERE fecha::date = current_date
    AND status NOT IN ('cancelled','devolucion','cambio','pending')
),
mes AS (
  SELECT COALESCE(SUM(total), 0) AS ventas_mes
  FROM v_ventas
  WHERE date_trunc('month', fecha) = date_trunc('month', now())
    AND status NOT IN ('cancelled','devolucion','cambio','pending')
),
compras_mes AS (
  SELECT COALESCE(SUM(total), 0) AS compras_mes
  FROM compras
  WHERE date_trunc('month', created_at) = date_trunc('month', now())
    AND estado != 'cancelada'
),
gastos_mes AS (
  SELECT COALESCE(SUM(monto), 0) AS gastos_mes
  FROM gastos
  WHERE date_trunc('month', fecha) = date_trunc('month', now())
),
cxc AS (
  SELECT
    COALESCE(SUM(monto - monto_pagado), 0)        AS saldo_cobrar,
    COUNT(*) FILTER (WHERE estado = 'vencida')    AS vencidas_cobrar
  FROM cuentas_cobrar
  WHERE estado != 'pagada'
),
cxp AS (
  SELECT
    COALESCE(SUM(total - monto_pagado), 0)        AS saldo_pagar,
    COUNT(*) FILTER (
      WHERE fecha_vencimiento < current_date)     AS vencidas_pagar
  FROM compras
  WHERE forma_pago != 'contado' AND monto_pagado < total
),
inv AS (
  SELECT
    COUNT(*) FILTER (WHERE talla_s+talla_m+talla_l = 0)           AS productos_agotados,
    COUNT(*) FILTER (WHERE talla_s+talla_m+talla_l BETWEEN 1 AND 5) AS productos_bajo_stock,
    COALESCE(SUM(precio*(talla_s+talla_m+talla_l)), 0)            AS valor_inventario
  FROM productos WHERE activo = true
)
SELECT
  hoy.ventas_hoy,
  hoy.transacciones_hoy,
  mes.ventas_mes,
  compras_mes.compras_mes,
  gastos_mes.gastos_mes,
  cxc.saldo_cobrar,
  cxc.vencidas_cobrar,
  cxp.saldo_pagar,
  cxp.vencidas_pagar,
  inv.productos_agotados,
  inv.productos_bajo_stock,
  inv.valor_inventario,
  GREATEST(0, mes.ventas_mes - compras_mes.compras_mes - gastos_mes.gastos_mes) AS utilidad_estimada
FROM hoy, mes, compras_mes, gastos_mes, cxc, cxp, inv;

GRANT SELECT ON v_kpis_dia TO authenticated;

-- ============================================================
-- FIN
-- Ejecutar en: https://supabase.com/dashboard/project/obijexmcqsgsjkrrftei/sql
-- ============================================================
