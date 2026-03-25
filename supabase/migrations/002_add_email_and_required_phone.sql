-- Ejecutar en Supabase Dashboard > SQL Editor
-- https://supabase.com/dashboard/project/obijexmcqsgsjkrrftei/sql

-- Add customer email column
alter table orders
  add column if not exists customer_email text;

-- Make phone not nullable for new rows (existing rows keep NULL)
-- If you want to enforce NOT NULL, uncomment these lines AFTER backfilling:
-- update orders set customer_phone = '' where customer_phone is null;
-- alter table orders alter column customer_phone set not null;
