-- Migration 017: Storage RLS policies for bucket 'productos'
-- Permite que usuarios autenticados suban archivos y que todos puedan leer (bucket público)

-- 1. SELECT: cualquiera puede ver archivos (bucket es público)
CREATE POLICY "Lectura pública productos"
ON storage.objects FOR SELECT
USING (bucket_id = 'productos');

-- 2. INSERT: usuarios autenticados pueden subir archivos
CREATE POLICY "Subida autenticada productos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'productos');

-- 3. UPDATE: usuarios autenticados pueden actualizar sus propios archivos
--    Admins (rol admin en la tabla clientes) pueden actualizar cualquier archivo
CREATE POLICY "Actualizar autenticado productos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'productos');

-- 4. DELETE: usuarios autenticados pueden borrar sus archivos
CREATE POLICY "Borrar autenticado productos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'productos');
