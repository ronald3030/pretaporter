-- Ejecutar en Supabase Dashboard > SQL Editor
-- https://supabase.com/dashboard/project/obijexmcqsgsjkrrftei/sql
--
-- Recreates the insert policy to ensure it exists and is correct.
-- The save-order Server Action now uses the service_role key (bypasses RLS),
-- but this policy is kept as a safety net.

-- Drop and recreate to ensure a clean state
drop policy if exists "allow_insert" on orders;

create policy "allow_insert" on orders
  for insert
  with check (true);
