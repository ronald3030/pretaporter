-- ══════════════════════════════════════════════════════════════════
--  029 — Guardar la clave del .p12 en la tabla certificados_ecf
--
--  Antes: la clave se guardaba SOLO en flutter_secure_storage (por dispositivo)
--         o en Supabase Vault (setup manual complicado).
--  Ahora: la clave se guarda en la columna clave_p12 de certificados_ecf,
--         accesible desde Flutter (auth) y desde la Edge Function (service_role).
--         Los usuarios autenticados pueden leerla para firmar e-CF en el POS.
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE certificados_ecf
  ADD COLUMN IF NOT EXISTS clave_p12 TEXT;

-- Actualizar get_ecf_cert_password() para leer de la tabla
-- (elimina la dependencia de Supabase Vault)
CREATE OR REPLACE FUNCTION get_ecf_cert_password()
RETURNS TABLE (password TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT clave_p12
    FROM   certificados_ecf
    WHERE  activo    = true
      AND  clave_p12 IS NOT NULL
    LIMIT  1;
END;
$$;

-- Permitir que usuarios autenticados lean la clave
-- (necesario para que Flutter pueda obtenerla para firmar localmente)
-- La política existente "Auth lee certificados" ya cubre SELECT, por lo que
-- clave_p12 queda incluida automáticamente.

COMMENT ON COLUMN certificados_ecf.clave_p12 IS
  'Contraseña del .p12 — guardada aquí para acceso desde POS (Flutter) y web (Edge Function). Solo usuarios autenticados pueden leerla.';
