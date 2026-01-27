-- Planes de Membresía
create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  duration_days integer not null default 30,
  discount_percent numeric(5,2) not null default 0,
  benefits jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ajustes por compatibilidad si la tabla ya existía desde 0009_memberships.sql
alter table public.membership_plans add column if not exists price numeric(10,2) not null default 0;
alter table public.membership_plans add column if not exists duration_days integer not null default 30;
alter table public.membership_plans add column if not exists discount_percent numeric(5,2) not null default 0;
alter table public.membership_plans add column if not exists benefits jsonb;
alter table public.membership_plans add column if not exists active boolean not null default true;

do $$
begin
  -- Si existe monthly_price (esquema anterior), copiarlo a price si price está en cero
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'membership_plans' and column_name = 'monthly_price'
  ) then
    update public.membership_plans set price = monthly_price where price = 0;
  end if;
end$$;

create index if not exists idx_membership_plans_active on public.membership_plans(active);

-- Membresías por Cliente
create table if not exists public.client_memberships (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  plan_id uuid not null references public.membership_plans(id) on delete restrict,
  start_date date not null default (now()::date),
  end_date date,
  status text not null default 'active' check (status in ('active','expired','cancelled')),
  auto_renew boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_client_memberships_client on public.client_memberships(client_id);
create index if not exists idx_client_memberships_status on public.client_memberships(status);

-- Trigger updated_at genérico ya definido: set_timestamp_updated_at()
drop trigger if exists trg_membership_plans_set_updated on public.membership_plans;
create trigger trg_membership_plans_set_updated
before update on public.membership_plans
for each row execute function public.set_timestamp_updated_at();

drop trigger if exists trg_client_memberships_set_updated on public.client_memberships;
create trigger trg_client_memberships_set_updated
before update on public.client_memberships
for each row execute function public.set_timestamp_updated_at();

-- Calcular end_date automáticamente según duration_days del plan si no se provee
create or replace function public.cm_set_end_date()
returns trigger as $$
declare
  dur integer;
begin
  if new.end_date is null then
    select duration_days into dur from public.membership_plans where id = new.plan_id;
    if dur is null then
      dur := 30;
    end if;
    new.end_date = (new.start_date + make_interval(days => dur))::date;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cm_set_end_date on public.client_memberships;
create trigger trg_cm_set_end_date
before insert on public.client_memberships
for each row execute function public.cm_set_end_date();

-- RLS
alter table public.membership_plans enable row level security;
alter table public.client_memberships enable row level security;

-- Políticas (autenticados)
drop policy if exists authenticated_select_membership_plans on public.membership_plans;
create policy authenticated_select_membership_plans on public.membership_plans
for select to authenticated using (true);

drop policy if exists authenticated_modify_membership_plans on public.membership_plans;
create policy authenticated_modify_membership_plans on public.membership_plans
for all to authenticated using (true) with check (true);

drop policy if exists authenticated_select_client_memberships on public.client_memberships;
create policy authenticated_select_client_memberships on public.client_memberships
for select to authenticated using (true);

drop policy if exists authenticated_modify_client_memberships on public.client_memberships;
create policy authenticated_modify_client_memberships on public.client_memberships
for all to authenticated using (true) with check (true);