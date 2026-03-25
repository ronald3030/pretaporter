-- Ejecutar en Supabase Dashboard > SQL Editor
-- https://supabase.com/dashboard/project/obijexmcqsgsjkrrftei/sql

create table if not exists orders (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),

  -- Cliente
  customer_name   text not null,
  customer_phone  text,

  -- Ubicación de entrega
  address           text not null,
  address_reference text,
  lat               double precision,
  lng               double precision,
  distance_km       double precision,

  -- Entrega
  delivery_date  date not null,

  -- Productos (array JSON con CartItem)
  items  jsonb not null,

  -- Totales
  total_dop  numeric(12, 2) not null,
  total_usd  numeric(12, 2) not null,

  -- PayPal
  paypal_order_id  text,
  status           text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled', 'delivered'))
);

-- Índices útiles
create index if not exists orders_status_idx on orders(status);
create index if not exists orders_created_at_idx on orders(created_at desc);

-- RLS: solo el service role puede leer, anon puede insertar (para checkout público)
alter table orders enable row level security;

-- Force RLS even for table owner (prevents accidental bypass)
alter table orders force row level security;

create policy "allow_insert" on orders
  for insert to anon
  with check (true);

-- Para ver pedidos desde el dashboard necesitas usar el service role o desactivar RLS
