-- ============================================================
-- 006_orders_admin_policy.sql
-- Permite al admin autenticado leer y actualizar órdenes
-- ============================================================

-- Admin puede leer todas las órdenes
CREATE POLICY "admin_select_orders" ON orders
  FOR SELECT TO authenticated
  USING (true);

-- Admin puede actualizar el status de cualquier orden
CREATE POLICY "admin_update_orders" ON orders
  FOR UPDATE TO authenticated
  USING (true);
