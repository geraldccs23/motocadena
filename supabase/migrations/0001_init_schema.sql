-- Extensiones necesarias
create extension if not exists pgcrypto;

-- Tipos enumerados
do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'mechanic', 'receptionist');
  end if;
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum ('pending', 'in_progress', 'completed');
  end if;
end $$;

-- Usuarios
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  username text not null unique,
  password_hash text not null,
  role user_role not null default 'mechanic',
  phone text,
  email text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Clientes
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  vehicle_plate text,
  vehicle_brand text,
  vehicle_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Servicios
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  base_price numeric(10,2) not null default 0,
  duration_minutes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Órdenes de trabajo
create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  mechanic_id uuid references public.users(id) on delete set null,
  service_id uuid not null references public.services(id) on delete restrict,
  status order_status not null default 'pending',
  notes text,
  total numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices útiles
create index if not exists idx_work_orders_client on public.work_orders(client_id);
create index if not exists idx_work_orders_service on public.work_orders(service_id);
create index if not exists idx_services_name on public.services(name);
create index if not exists idx_users_username on public.users(username);