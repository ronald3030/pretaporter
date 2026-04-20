-- 027_ecf_vault_helper.sql
-- Función auxiliar para que la Edge Function `emitir-ecf` lea la contraseña
-- del certificado .p12 desde Supabase Vault de forma segura.
--
-- SETUP (ejecutar UNA VEZ en el dashboard de Supabase → Vault):
--   SELECT vault.create_secret('TU_CONTRASEÑA_DEL_P12', 'ecf_cert_password');
--
-- La Edge Function llama a esta función con service_role y obtiene el valor.

CREATE OR REPLACE FUNCTION get_ecf_cert_password()
RETURNS TABLE (password TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT decrypted_secret::TEXT
    FROM   vault.decrypted_secrets
    WHERE  name = 'ecf_cert_password'
    LIMIT  1;
END;
$$;

-- Solo service_role puede llamar esta función
REVOKE EXECUTE ON FUNCTION get_ecf_cert_password() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION get_ecf_cert_password() TO   service_role;
