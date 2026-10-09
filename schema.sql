-- ============================================================
-- Sistema de Registro de Viviendas TEC
-- Esquema para Supabase (PostgreSQL)
-- ============================================================
-- Cómo usarlo:
-- 1. Crear un proyecto en https://supabase.com
-- 2. Ir a "SQL Editor" -> "New query"
-- 3. Pegar todo este archivo y ejecutar (Run)
-- ============================================================

-- Necesaria para el "exclusion constraint" que evita choques de horario
create extension if not exists btree_gist;

-- ---------- Departamentos encargados ----------
create table if not exists departamentos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

-- ---------- Casas ----------
create table if not exists casas (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  cantidad_cuartos int not null check (cantidad_cuartos between 1 and 10),
  creado_en timestamptz not null default now()
);

-- ---------- Cuartos ----------
create table if not exists cuartos (
  id uuid primary key default gen_random_uuid(),
  casa_id uuid not null references casas(id) on delete cascade,
  numero int not null check (numero between 1 and 10),
  unique (casa_id, numero)
);

-- ---------- Tipo de ocupación ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_ocupacion') then
    create type tipo_ocupacion as enum ('fijo', 'semestral', 'periodo');
  end if;
end$$;

-- ---------- Registros de ocupación ----------
-- inicio/fin son timestamps completos (fecha + hora), así un registro
-- puede ser de día(s) completo(s) o de solo un rango de horas.
-- "dia_completo = true" es solo para que la interfaz sepa qué mostrar;
-- la validación real de choques siempre usa inicio/fin.
create table if not exists registros (
  id uuid primary key default gen_random_uuid(),
  cuarto_id uuid not null references cuartos(id) on delete cascade,
  nombre_persona text not null,
  departamento_id uuid references departamentos(id),
  tipo tipo_ocupacion not null,
  dia_completo boolean not null default true,
  sin_fecha_salida boolean not null default false, -- para "fijo" indefinido
  inicio timestamptz not null,
  fin timestamptz not null,
  creado_en timestamptz not null default now(),
  check (fin > inicio),
  -- Esto es lo que impide, a nivel de base de datos, que dos personas
  -- queden en el mismo cuarto con horarios que se traslapen:
  exclude using gist (
    cuarto_id with =,
    tstzrange(inicio, fin, '[)') with &&
  )
);

create index if not exists idx_registros_cuarto on registros (cuarto_id);
create index if not exists idx_cuartos_casa on cuartos (casa_id);

-- ---------- Correo del ocupante ----------
-- Necesario para poder enviarle el correo de confirmación de registro.
-- Se agrega con ALTER para que también funcione si ya tenías la tabla creada.
alter table registros add column if not exists correo_persona text;

-- ---------- Seguridad básica (Row Level Security) ----------
-- Solo usuarios autenticados (login con correo/contraseña de Supabase Auth)
-- pueden leer o escribir. Sin sesión iniciada, la base de datos rechaza
-- cualquier consulta aunque alguien tenga la llave "anon" a mano.
alter table departamentos enable row level security;
alter table casas enable row level security;
alter table cuartos enable row level security;
alter table registros enable row level security;

drop policy if exists "acceso total departamentos" on departamentos;
drop policy if exists "acceso total casas" on casas;
drop policy if exists "acceso total cuartos" on cuartos;
drop policy if exists "acceso total registros" on registros;
drop policy if exists "autenticados departamentos" on departamentos;
drop policy if exists "autenticados casas" on casas;
drop policy if exists "autenticados cuartos" on cuartos;
drop policy if exists "autenticados registros" on registros;

create policy "autenticados departamentos" on departamentos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "autenticados casas" on casas for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "autenticados cuartos" on cuartos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "autenticados registros" on registros for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- Podés correr TODO este script las veces que quieras sin miedo a romper
-- nada: los "create table/column/index if not exists" no tocan tus datos,
-- y los "drop policy if exists" (de ambos nombres, el viejo y el actual)
-- + "create policy" de arriba dejan las políticas siempre al día.
-- ============================================================
