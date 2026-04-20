-- ============================================================
-- 024_drop_clientes_tienda.sql
-- Elimina la tabla clientes_tienda (creada manualmente, sin uso).
-- Toda la información de canal (web / tienda / ambos) ya está
-- consolidada en la tabla `clientes` via el campo `canales TEXT[]`
-- y los triggers trg_cliente_order / trg_cliente_venta_tienda.
-- ============================================================

DROP TABLE IF EXISTS clientes_tienda CASCADE;

-- ============================================================
-- FIN
-- Ejecutar en: https://supabase.com/dashboard/project/obijexmcqsgsjkrrftei/sql
-- ============================================================
