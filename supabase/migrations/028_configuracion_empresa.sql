-- ══════════════════════════════════════════════════════════════════
--  Configuración de la empresa (datos del emisor para e-CF DGII)
--  Una sola fila; editable desde el admin Flutter.
-- ══════════════════════════════════════════════════════════════════

create table if not exists configuracion_empresa (
  id               uuid        primary key default gen_random_uuid(),

  -- Datos fiscales
  rnc              text        not null,
  razon_social     text        not null,
  nombre_comercial text,

  -- Contacto
  correo           text,
  telefono         text,
  sitio_web        text,

  -- Dirección
  direccion        text,
  provincia        text,
  municipio        text,

  -- Logo
  logo_url         text,

  -- Auditoría
  actualizado_por  uuid        references auth.users(id) on delete set null,
  updated_at       timestamptz not null default now()
);

-- Solo una fila activa (constraint por CHECK en trigger)
-- Usamos INSERT … ON CONFLICT DO UPDATE en el servicio.

-- RLS
alter table configuracion_empresa enable row level security;

-- Cualquier autenticado puede leer
drop policy if exists "Auth lee config empresa" on configuracion_empresa;
create policy "Auth lee config empresa"
  on configuracion_empresa for select
  using (auth.role() = 'authenticated');

-- Solo admins pueden escribir
drop policy if exists "Admin escribe config empresa" on configuracion_empresa;
create policy "Admin escribe config empresa"
  on configuracion_empresa for all
  using (
    auth.role() = 'authenticated' and
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    auth.role() = 'authenticated' and
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Fila inicial con los datos actuales de Prêt à Porter
insert into configuracion_empresa (
  rnc, razon_social, nombre_comercial,
  correo, telefono, sitio_web,
  direccion, provincia, municipio
) values (
  '132866088',
  'Inversiones Mdelancer SRL',
  'Prêt à Porter',
  'info@pretaporter.com',
  '+1 (829) 000-0000',
  'https://pret-a-porter-eta.vercel.app',
  'Abraham Lincoln 617, Local 25A, Plaza Castilla',
  'Distrito Nacional',
  'Santo Domingo de Guzmán'
)
on conflict do nothing;
