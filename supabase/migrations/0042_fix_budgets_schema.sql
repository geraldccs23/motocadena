-- 0042_fix_budgets_schema.sql
-- Reconstruction script for Budgets module (handles failures in previous migrations)

begin;

-- 1. Ensure the enum exists
do $$ begin
  if not exists (select 1 from pg_type where typname = 'budget_status') then
    create type budget_status as enum ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED');
  end if;
end $$;

-- 2. Ensure updated_at function exists
create or replace function public.set_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 3. Create Budgets Table (with manual entry support integrated)
create sequence if not exists public.budgets_number_seq;

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  budget_number bigint unique default nextval('public.budgets_number_seq'::regclass),
  workshop_id uuid references public.workshops(id) on delete set null,
  customer_id uuid references public.customers(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  manual_customer_name text,
  manual_vehicle_name text,
  status budget_status not null default 'DRAFT',
  valid_until timestamptz,
  notes text,
  total_amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Create Budget Items Table
create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_item_content check (
    (service_id is not null or product_id is not null or description is not null)
  )
);

-- 5. RLS Policies
alter table public.budgets enable row level security;
alter table public.budget_items enable row level security;

do $$ begin
  -- Budgets
  if not exists (select 1 from pg_policies where tablename='budgets' and policyname='auth_select_budgets') then
    create policy auth_select_budgets on public.budgets for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='budgets' and policyname='auth_insert_budgets') then
    create policy auth_insert_budgets on public.budgets for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='budgets' and policyname='auth_update_budgets') then
    create policy auth_update_budgets on public.budgets for update to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='budgets' and policyname='auth_delete_budgets') then
    create policy auth_delete_budgets on public.budgets for delete to authenticated using (true);
  end if;

  -- Items
  if not exists (select 1 from pg_policies where tablename='budget_items' and policyname='auth_select_budget_items') then
    create policy auth_select_budget_items on public.budget_items for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='budget_items' and policyname='auth_insert_budget_items') then
    create policy auth_insert_budget_items on public.budget_items for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='budget_items' and policyname='auth_update_budget_items') then
    create policy auth_update_budget_items on public.budget_items for update to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='budget_items' and policyname='auth_delete_budget_items') then
    create policy auth_delete_budget_items on public.budget_items for delete to authenticated using (true);
  end if;
end $$;

-- 6. Triggers
drop trigger if exists trg_budgets_set_updated on public.budgets;
create trigger trg_budgets_set_updated
before update on public.budgets
for each row execute function public.set_timestamp_updated_at();

drop trigger if exists trg_budget_items_set_updated on public.budget_items;
create trigger trg_budget_items_set_updated
before update on public.budget_items
for each row execute function public.set_timestamp_updated_at();

-- 7. Recalculation Function
create or replace function public.recalc_budget_total()
returns trigger as $$
declare
  bid uuid;
begin
  bid := coalesce(NEW.budget_id, OLD.budget_id);
  update public.budgets b
  set total_amount = coalesce((
    select sum(i.quantity * i.unit_price)
    from public.budget_items i
    where i.budget_id = b.id
  ), 0)
  where b.id = bid;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_budget_total_ins on public.budget_items;
create trigger trg_budget_total_ins
after insert on public.budget_items
for each row execute function public.recalc_budget_total();

drop trigger if exists trg_budget_total_upd on public.budget_items;
create trigger trg_budget_total_upd
after update on public.budget_items
for each row execute function public.recalc_budget_total();

drop trigger if exists trg_budget_total_del on public.budget_items;
create trigger trg_budget_total_del
after delete on public.budget_items
for each row execute function public.recalc_budget_total();

commit;
