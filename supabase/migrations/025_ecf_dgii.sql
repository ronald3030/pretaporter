-- ══════════════════════════════════════════════════════════════════
--  e-CF DGII — Tablas y RLS
--  Prêt à Porter · Un solo certificado para toda la empresa
--  Aplica a ventas POS (Flutter) y ventas web (Next.js)
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Bucket privado para el .p12 ────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'certificados-ecf',
  'certificados-ecf',
  false,
  10485760,  -- 10 MB
  array['application/x-pkcs12', 'application/octet-stream']
)
on conflict (id) do nothing;

-- Solo usuarios autenticados pueden acceder al bucket
drop policy if exists "Acceso autenticado bucket ecf" on storage.objects;
create policy "Acceso autenticado bucket ecf"
  on storage.objects for all
  using  (bucket_id = 'certificados-ecf' and auth.role() = 'authenticated')
  with check (bucket_id = 'certificados-ecf' and auth.role() = 'authenticated');

-- ── 2. Tabla certificados_ecf ──────────────────────────────────────
-- Guarda metadatos del .p12 activo.
-- El archivo real vive en Storage (bucket certificados-ecf).
-- Solo un registro con activo = true a la vez (constraint parcial).
create table if not exists certificados_ecf (
  id             uuid        primary key default gen_random_uuid(),
  nombre_archivo text        not null,
  storage_path   text        not null,           -- path dentro del bucket
  activo         boolean     not null default true,
  subido_por     uuid        references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

-- Garantiza un único certificado activo
create unique index if not exists uq_certificado_activo
  on certificados_ecf (activo)
  where activo = true;

-- RLS
alter table certificados_ecf enable row level security;

-- Cualquier usuario autenticado puede leer (para descargar y firmar)
drop policy if exists "Auth lee certificados"   on certificados_ecf;
drop policy if exists "Admin escribe certificados" on certificados_ecf;

create policy "Auth lee certificados"
  on certificados_ecf for select
  using (auth.role() = 'authenticated');

-- Solo admins pueden insertar / actualizar / eliminar
create policy "Admin escribe certificados"
  on certificados_ecf for all
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

-- ── 3. Tabla comprobantes_ecf ──────────────────────────────────────
-- Registro de cada e-CF emitido (POS o web).
create table if not exists comprobantes_ecf (
  id               uuid        primary key default gen_random_uuid(),

  -- Origen de la venta
  origen           text        not null check (origen in ('pos', 'web')),
  venta_id         uuid,           -- FK a ventas_tienda.id  o  orders.id

  -- Datos del comprobante
  tipo_ecf         text        not null default '32',  -- 32 = B02 Consumidor Final
  encf             text,            -- ej. B0200000001 (asignado por DGII)
  secuencia_local  bigint,          -- número interno antes de confirmación
  fecha_emision    date        not null default current_date,

  -- Estado con la DGII
  track_id         text,            -- id de seguimiento de la DGII
  estado           text        not null default 'pendiente'
                                check (estado in ('pendiente','enviado','aceptado','rechazado','error')),
  codigo_seguridad text,            -- para el QR

  -- Comprador (B02 = consumidor final, datos mínimos)
  rnc_comprador    text,
  nombre_comprador text,

  -- Montos
  monto_exento     numeric(12,2) not null default 0,
  monto_gravado    numeric(12,2) not null default 0,
  itbis_total      numeric(12,2) not null default 0,
  monto_total      numeric(12,2) not null,

  -- Payload
  xml_sin_firma    text,
  xml_firmado      text,
  respuesta_dgii   jsonb,

  -- Auditoría
  creado_por       uuid        references auth.users(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- Índices útiles
create index if not exists idx_comprobantes_ecf_estado   on comprobantes_ecf (estado);
create index if not exists idx_comprobantes_ecf_origen   on comprobantes_ecf (origen);
create index if not exists idx_comprobantes_ecf_venta    on comprobantes_ecf (venta_id);
create index if not exists idx_comprobantes_ecf_fecha    on comprobantes_ecf (fecha_emision);

-- RLS
alter table comprobantes_ecf enable row level security;

-- Cualquier usuario autenticado puede insertar y leer sus comprobantes
drop policy if exists "Auth gestiona comprobantes" on comprobantes_ecf;
create policy "Auth gestiona comprobantes"
  on comprobantes_ecf for all
  using  (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── 4. Secuencia local de e-NCF ───────────────────────────────────
-- Tabla de control para el próximo número de secuencia por tipo
create table if not exists secuencia_encf (
  tipo_ecf    text    primary key,  -- '32' para B02
  prefijo     text    not null,     -- 'B02'
  siguiente   bigint  not null default 1,
  maximo      bigint  not null default 99999999,
  vigencia    date    not null      -- fecha límite asignada por DGII
);

alter table secuencia_encf enable row level security;

drop policy if exists "Auth lee secuencia" on secuencia_encf;
drop policy if exists "Admin escribe secuencia" on secuencia_encf;

create policy "Auth lee secuencia"
  on secuencia_encf for select
  using (auth.role() = 'authenticated');

create policy "Admin escribe secuencia"
  on secuencia_encf for all
  using (
    auth.role() = 'authenticated' and
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    auth.role() = 'authenticated' and
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Función atómica para obtener y avanzar el siguiente número
create or replace function siguiente_encf(p_tipo text)
returns text
language plpgsql
security definer
as $$
declare
  v_row secuencia_encf%rowtype;
  v_numero text;
begin
  select * into v_row
  from secuencia_encf
  where tipo_ecf = p_tipo
  for update;

  if not found then
    raise exception 'No hay secuencia configurada para tipo %', p_tipo;
  end if;

  if v_row.siguiente > v_row.maximo then
    raise exception 'Secuencia de e-NCF agotada para tipo %', p_tipo;
  end if;

  if current_date > v_row.vigencia then
    raise exception 'Secuencia de e-NCF vencida para tipo %', p_tipo;
  end if;

  -- Formato: B02 + 8 dígitos con ceros
  v_numero := v_row.prefijo || lpad(v_row.siguiente::text, 8, '0');

  update secuencia_encf
  set siguiente = siguiente + 1
  where tipo_ecf = p_tipo;

  return v_numero;
end;
$$;

-- Datos iniciales de prueba (reemplazar con los asignados por DGII)
insert into secuencia_encf (tipo_ecf, prefijo, siguiente, maximo, vigencia)
values ('32', 'B02', 1, 99999999, '2026-12-31')
on conflict (tipo_ecf) do nothing;

-- ── COMENTARIOS DE USO ────────────────────────────────────────────
-- 1. Ejecutar este SQL en el SQL Editor de Supabase Dashboard
-- 2. Verificar que el bucket 'certificados-ecf' aparezca en Storage
-- 3. El admin sube el .p12 desde la app Flutter (CertificateUploadScreen)
-- 4. La contraseña del .p12 se guarda en flutter_secure_storage en cada dispositivo
-- 5. Para la web (Next.js), la contraseña se guarda en Supabase Vault:
--    vault.secrets  key='ecf_cert_password'  value='...'
