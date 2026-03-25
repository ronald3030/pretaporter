-- Ejecutar en Supabase Dashboard > SQL Editor
-- https://supabase.com/dashboard/project/obijexmcqsgsjkrrftei/sql

-- Add shipping columns to orders table
alter table orders
  add column if not exists shipping_method     text             not null default 'delivery'
    check (shipping_method in ('pickup', 'delivery')),
  add column if not exists shipping_zone       text,
  add column if not exists shipping_cost_dop   numeric(12, 2)   not null default 0;
