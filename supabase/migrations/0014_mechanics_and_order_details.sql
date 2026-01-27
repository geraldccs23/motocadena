-- Mecánicos y Detalles de Órdenes
create extension if not exists pgcrypto;

-- Tabla de mecánicos/operadores (independiente de usuarios de autenticación)
create table if not exists public.mechanics (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mechanics_fullname on public.mechanics(full_name);

alter table public.mechanics enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'mechanics'
  ) then
    create policy authenticated_select_mechanics on public.mechanics
      for select to authenticated using (true);

    create policy authenticated_insert_mechanics on public.mechanics
      for insert to authenticated with check (true);

    create policy authenticated_update_mechanics on public.mechanics
      for update to authenticated using (true) with check (true);
  end if;
end $$;

-- Asignación opcional de mecánico (tabla mechanics) a la orden
alter table public.work_orders
  add column if not exists assigned_mechanic_id uuid references public.mechanics(id) on delete set null;

create index if not exists idx_work_orders_assigned_mechanic on public.work_orders(assigned_mechanic_id);

-- Detalles de la orden: múltiples servicios por orden
create table if not exists public.work_order_services (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wos_order on public.work_order_services(work_order_id);
create index if not exists idx_wos_service on public.work_order_services(service_id);

alter table public.work_order_services enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'work_order_services'
  ) then
    create policy authenticated_select_wos on public.work_order_services
      for select to authenticated using (true);

    create policy authenticated_insert_wos on public.work_order_services
      for insert to authenticated with check (true);

    create policy authenticated_update_wos on public.work_order_services
      for update to authenticated using (true) with check (true);
  end if;
end $$;

-- Nota: el cálculo de total puede hacerse en UI o vía trigger/función.
-- Si se desea en BD, agregar una función que sume quantity*unit_price por orden
-- y actualice work_orders.total en ON INSERT/UPDATE/DELETE de work_order_services.