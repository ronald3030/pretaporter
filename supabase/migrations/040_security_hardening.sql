-- ============================================================
-- 040_security_hardening.sql
-- Tres correcciones de seguridad y rendimiento:
--
-- 1. auth_rls_initplan  — Envuelve auth.uid() / auth.role() con
--    (select ...) para que Postgres evalúe la función UNA sola vez
--    por query en lugar de una vez por fila.
--
-- 2. multiple_permissive_policies — Consolida políticas SELECT + ALL
--    superpuestas en una sola política por tabla/operación/rol.
--
-- 3. duplicate_index — Elimina índices redundantes detectados por el
--    analizador de Supabase.
--
-- Ejecutar en:
-- https://supabase.com/dashboard/project/obijexmcqsgsjkrrftei/sql
-- ============================================================

-- ──────────────────────────────────────────────────────────────────
-- SECCIÓN 1 · auth_rls_initplan + multiple_permissive_policies
-- Patrón: DROP + CREATE con (select auth.uid()) / (select auth.role())
-- ──────────────────────────────────────────────────────────────────

-- ── devoluciones ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "admins_devoluciones" ON devoluciones;
CREATE POLICY "admins_devoluciones"
  ON devoluciones FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

-- ── clientes ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "staff_clientes" ON clientes;
CREATE POLICY "staff_clientes"
  ON clientes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  );

-- ── proveedores ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_manage_proveedores" ON proveedores;
CREATE POLICY "admin_manage_proveedores"
  ON proveedores FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

-- ── compras ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_manage_compras" ON compras;
-- También eliminar variante de roles ampliados creada en 035
DROP POLICY IF EXISTS "staff_manage_compras"  ON compras;
CREATE POLICY "admin_manage_compras"
  ON compras FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  );

-- ── gastos ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_manage_gastos"  ON gastos;
DROP POLICY IF EXISTS "staff_manage_gastos"  ON gastos;
CREATE POLICY "admin_manage_gastos"
  ON gastos FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  );

-- ── cuentas_cobrar ────────────────────────────────────────────────
-- Tres políticas → una sola con lógica combinada
DROP POLICY IF EXISTS "admin_manage_cuentas_cobrar"    ON cuentas_cobrar;
DROP POLICY IF EXISTS "staff_manage_cuentas_cobrar"    ON cuentas_cobrar;
DROP POLICY IF EXISTS "ventas_select_cuentas_cobrar"   ON cuentas_cobrar;
DROP POLICY IF EXISTS "ventas_insert_cuentas_cobrar"   ON cuentas_cobrar;

-- SELECT: admin + ventas pueden leer
CREATE POLICY "cuentas_cobrar_select"
  ON cuentas_cobrar FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  );

-- INSERT: admin + ventas pueden crear
CREATE POLICY "cuentas_cobrar_insert"
  ON cuentas_cobrar FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  );

-- UPDATE / DELETE: solo admin
CREATE POLICY "cuentas_cobrar_admin_write"
  ON cuentas_cobrar FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

-- ── certificados_ecf ─────────────────────────────────────────────
-- Antes: SELECT para todos + ALL para admins → overlap en SELECT
-- Ahora: SELECT para todos, INSERT/UPDATE/DELETE solo para admins
DROP POLICY IF EXISTS "Auth lee certificados"     ON certificados_ecf;
DROP POLICY IF EXISTS "Admin escribe certificados" ON certificados_ecf;

CREATE POLICY "certificados_ecf_select"
  ON certificados_ecf FOR SELECT TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "certificados_ecf_insert"
  ON certificados_ecf FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "certificados_ecf_update"
  ON certificados_ecf FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "certificados_ecf_delete"
  ON certificados_ecf FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ── comprobantes_ecf ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Auth gestiona comprobantes" ON comprobantes_ecf;
CREATE POLICY "Auth gestiona comprobantes"
  ON comprobantes_ecf FOR ALL TO authenticated
  USING  ((SELECT auth.role()) = 'authenticated')
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- ── secuencia_encf ────────────────────────────────────────────────
-- Misma estructura que certificados_ecf
DROP POLICY IF EXISTS "Auth lee secuencia"    ON secuencia_encf;
DROP POLICY IF EXISTS "Admin escribe secuencia" ON secuencia_encf;

CREATE POLICY "secuencia_encf_select"
  ON secuencia_encf FOR SELECT TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "secuencia_encf_insert"
  ON secuencia_encf FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "secuencia_encf_update"
  ON secuencia_encf FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "secuencia_encf_delete"
  ON secuencia_encf FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ── configuracion_empresa ─────────────────────────────────────────
DROP POLICY IF EXISTS "Auth lee config empresa"    ON configuracion_empresa;
DROP POLICY IF EXISTS "Admin escribe config empresa" ON configuracion_empresa;

CREATE POLICY "config_empresa_select"
  ON configuracion_empresa FOR SELECT TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "config_empresa_insert"
  ON configuracion_empresa FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "config_empresa_update"
  ON configuracion_empresa FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "config_empresa_delete"
  ON configuracion_empresa FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ── codigos_descuento ─────────────────────────────────────────────
-- admin_manage_codigos (ALL) + anon_validate (SELECT anon) +
-- ventas_read_codigos (SELECT auth) → overlap en SELECT autenticado
DROP POLICY IF EXISTS "admin_manage_codigos" ON codigos_descuento;
DROP POLICY IF EXISTS "ventas_read_codigos"  ON codigos_descuento;
-- anon_validate_codigo se mantiene (es para rol anon, no overlap)

-- SELECT: admin + ventas
CREATE POLICY "codigos_select_staff"
  ON codigos_descuento FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  );

-- INSERT / UPDATE / DELETE: solo admin
CREATE POLICY "codigos_admin_write"
  ON codigos_descuento FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "codigos_admin_update"
  ON codigos_descuento FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "codigos_admin_delete"
  ON codigos_descuento FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ── orders ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_select_orders" ON orders;
DROP POLICY IF EXISTS "admin_update_orders" ON orders;
DROP POLICY IF EXISTS "admin_delete_orders" ON orders;

CREATE POLICY "admin_select_orders"
  ON orders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  );

CREATE POLICY "admin_update_orders"
  ON orders FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  );

CREATE POLICY "admin_delete_orders"
  ON orders FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

-- ── productos ─────────────────────────────────────────────────────
-- Consolidar los 4 políticas separadas en un bloque claro
DROP POLICY IF EXISTS "admin_select_all" ON productos;
DROP POLICY IF EXISTS "admin_insert"     ON productos;
DROP POLICY IF EXISTS "admin_update"     ON productos;
DROP POLICY IF EXISTS "admin_delete"     ON productos;

-- SELECT: todos los autenticados (admin + ventas)
CREATE POLICY "productos_auth_select"
  ON productos FOR SELECT TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

-- INSERT / UPDATE / DELETE: solo admin y ventas
CREATE POLICY "productos_staff_insert"
  ON productos FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  );

CREATE POLICY "productos_staff_update"
  ON productos FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  );

CREATE POLICY "productos_admin_delete"
  ON productos FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

-- ── profiles ──────────────────────────────────────────────────────
-- own_profile_select + admin_profiles_select ambas son SELECT → overlap
DROP POLICY IF EXISTS "own_profile_select"    ON profiles;
DROP POLICY IF EXISTS "admin_profiles_select" ON profiles;
DROP POLICY IF EXISTS "admin_profiles_update" ON profiles;

-- SELECT: propio perfil O ser admin
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles AS p2
      WHERE p2.id = (SELECT auth.uid()) AND p2.role = 'admin'
    )
  );

-- UPDATE: solo admin puede actualizar perfiles
CREATE POLICY "profiles_admin_update"
  ON profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS p2
      WHERE p2.id = (SELECT auth.uid()) AND p2.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles AS p2
      WHERE p2.id = (SELECT auth.uid()) AND p2.role = 'admin'
    )
  );

-- ── ventas_tienda ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "staff_manage_ventas_tienda" ON ventas_tienda;

CREATE POLICY "staff_manage_ventas_tienda"
  ON ventas_tienda FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  );

-- ── caja_sesiones ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_manage_caja_sesiones" ON caja_sesiones;
CREATE POLICY "admin_manage_caja_sesiones"
  ON caja_sesiones FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  );

-- ── caja_movimientos ──────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_manage_caja_movimientos" ON caja_movimientos;
CREATE POLICY "admin_manage_caja_movimientos"
  ON caja_movimientos FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  );

-- ── inventario_movimientos ────────────────────────────────────────
DROP POLICY IF EXISTS "admin_read_inventario_mov"   ON inventario_movimientos;
DROP POLICY IF EXISTS "admin_insert_inventario_mov" ON inventario_movimientos;

CREATE POLICY "admin_read_inventario_mov"
  ON inventario_movimientos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  );

CREATE POLICY "admin_insert_inventario_mov"
  ON inventario_movimientos FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin','ventas')
    )
  );

-- ── Storage: bucket certificados-ecf ──────────────────────────────
DROP POLICY IF EXISTS "Acceso autenticado bucket ecf" ON storage.objects;
CREATE POLICY "Acceso autenticado bucket ecf"
  ON storage.objects FOR ALL
  USING  (bucket_id = 'certificados-ecf' AND (SELECT auth.role()) = 'authenticated')
  WITH CHECK (bucket_id = 'certificados-ecf' AND (SELECT auth.role()) = 'authenticated');

-- ── Storage: bucket productos ─────────────────────────────────────
-- Las políticas de productos se crean dinámicamente con EXECUTE
-- en migration 017. Si existen con nombres estáticos, las fijamos:
DROP POLICY IF EXISTS "Lectura pública productos"        ON storage.objects;
DROP POLICY IF EXISTS "Subida autenticada productos"     ON storage.objects;
DROP POLICY IF EXISTS "Actualizar autenticado productos" ON storage.objects;
DROP POLICY IF EXISTS "Borrar autenticado productos"     ON storage.objects;

CREATE POLICY "Lectura pública productos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'productos');

CREATE POLICY "Subida autenticada productos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'productos' AND (SELECT auth.role()) = 'authenticated');

CREATE POLICY "Actualizar autenticado productos"
  ON storage.objects FOR UPDATE TO authenticated
  USING  (bucket_id = 'productos' AND (SELECT auth.role()) = 'authenticated')
  WITH CHECK (bucket_id = 'productos' AND (SELECT auth.role()) = 'authenticated');

CREATE POLICY "Borrar autenticado productos"
  ON storage.objects FOR DELETE TO authenticated
  USING  (bucket_id = 'productos' AND (SELECT auth.role()) = 'authenticated');

-- ──────────────────────────────────────────────────────────────────
-- SECCIÓN 2 · duplicate_index
-- Eliminar índices redundantes detectados por el linter de Supabase.
-- Se conserva el índice más específico / parcial en cada par.
-- ──────────────────────────────────────────────────────────────────

-- compras: idx duplicados detectados (5 pares)
-- Los IF NOT EXISTS ya evitaron la mayoría, pero el linter encontró
-- índices con nombres distintos cubriendo las mismas columnas.
-- Eliminamos los creados en la migración 018 que son más genéricos
-- si existen versiones parciales o compuestas equivalentes.
DROP INDEX IF EXISTS compras_proveedor_idx;
DROP INDEX IF EXISTS compras_estado_idx;
DROP INDEX IF EXISTS compras_fecha_idx;
DROP INDEX IF EXISTS compras_forma_pago_idx;
DROP INDEX IF EXISTS compras_credito_pendiente_idx;

-- Recrear con nombres unificados (idx_ prefix)
CREATE INDEX IF NOT EXISTS idx_compras_proveedor
  ON compras(proveedor_id);

CREATE INDEX IF NOT EXISTS idx_compras_estado
  ON compras(estado);

CREATE INDEX IF NOT EXISTS idx_compras_fecha
  ON compras(fecha DESC);

CREATE INDEX IF NOT EXISTS idx_compras_forma_pago
  ON compras(forma_pago);

CREATE INDEX IF NOT EXISTS idx_compras_credito_pendiente
  ON compras(fecha_vencimiento)
  WHERE forma_pago != 'contado' AND monto_pagado < total;

-- cuentas_cobrar (4 pares)
DROP INDEX IF EXISTS cuentas_cobrar_estado_idx;
DROP INDEX IF EXISTS cuentas_cobrar_vencimiento_idx;
DROP INDEX IF EXISTS cuentas_cobrar_cliente_idx;
DROP INDEX IF EXISTS cuentas_cobrar_pendientes_idx;

CREATE INDEX IF NOT EXISTS idx_cuentas_cobrar_estado
  ON cuentas_cobrar(estado);

CREATE INDEX IF NOT EXISTS idx_cuentas_cobrar_vencimiento
  ON cuentas_cobrar(fecha_vencimiento);

CREATE INDEX IF NOT EXISTS idx_cuentas_cobrar_cliente
  ON cuentas_cobrar(cliente_nombre);

CREATE INDEX IF NOT EXISTS idx_cuentas_cobrar_pendientes
  ON cuentas_cobrar(fecha_vencimiento)
  WHERE estado IN ('pendiente','parcial','vencida');

-- gastos (3 pares)
DROP INDEX IF EXISTS gastos_fecha_idx;
DROP INDEX IF EXISTS gastos_categoria_idx;
DROP INDEX IF EXISTS gastos_proveedor_idx;

CREATE INDEX IF NOT EXISTS idx_gastos_fecha
  ON gastos(fecha DESC);

CREATE INDEX IF NOT EXISTS idx_gastos_categoria
  ON gastos(categoria);

CREATE INDEX IF NOT EXISTS idx_gastos_proveedor
  ON gastos(proveedor_id);

-- proveedores (1 par)
DROP INDEX IF EXISTS proveedores_nombre_idx;
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(nombre);

-- ventas_tienda (1 par)
-- idx_ventas_tienda_* ya tiene el prefijo correcto; si existe
-- algún índice sin prefijo, lo eliminamos.
DROP INDEX IF EXISTS ventas_tienda_status_idx;
DROP INDEX IF EXISTS ventas_tienda_created_idx;

-- ──────────────────────────────────────────────────────────────────
-- FIN
-- ============================================================
