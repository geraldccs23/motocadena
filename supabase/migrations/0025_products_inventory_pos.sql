-- 0025_products_inventory_pos.sql
-- Módulo de Productos/Repuestos, Compras, Inventario y POS

begin;

create extension if not exists pgcrypto;

-- Proveedores
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_suppliers_name on public.suppliers(name);
alter table public.suppliers enable row level security;

-- Productos/Repuestos
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  description text,
  unit_price numeric(10,2) not null default 0,
  unit_cost numeric(10,2) not null default 0,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_name on public.products(name);
alter table public.products enable row level security;

-- Movimientos de inventario (kardex)
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type text not null check (movement_type in ('in','out')),
  quantity numeric(10,2) not null check (quantity > 0),
  unit_cost numeric(10,2) not null default 0,
  source text check (source in ('purchase','sale','adjustment','init')),
  source_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_inv_mov_prod on public.inventory_movements(product_id);
create index if not exists idx_inv_mov_source on public.inventory_movements(source, source_id);
alter table public.inventory_movements enable row level security;

-- Compras
create sequence if not exists public.purchase_invoices_number_seq;

create table if not exists public.purchase_invoices (
  id uuid primary key default gen_random_uuid(),
  purchase_number bigint,
  supplier_id uuid references public.suppliers(id) on delete set null,
  status text not null default 'open' check (status in ('open','received','cancelled')),
  notes text,
  total numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.purchase_invoices
  alter column purchase_number set default nextval('public.purchase_invoices_number_seq'::regclass);

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'purchase_invoices' and column_name = 'purchase_number'
  ) then
    -- nada
  end if;
end $$;

alter table public.purchase_invoices
  add constraint purchase_invoices_purchase_number_key unique (purchase_number);

alter sequence public.purchase_invoices_number_seq owned by public.purchase_invoices.purchase_number;

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchase_invoices(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(10,2) not null check (quantity > 0),
  unit_cost numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_purchase_items_purchase on public.purchase_items(purchase_id);
create index if not exists idx_purchase_items_product on public.purchase_items(product_id);
alter table public.purchase_items enable row level security;

-- POS Ventas
create sequence if not exists public.pos_sales_number_seq;

create table if not exists public.pos_sales (
  id uuid primary key default gen_random_uuid(),
  sale_number bigint,
  status text not null default 'open' check (status in ('open','paid','void')),
  payment_method text check (payment_method in ('cash','card','transfer','mixed')),
  notes text,
  total numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pos_sales
  alter column sale_number set default nextval('public.pos_sales_number_seq'::regclass);

alter table public.pos_sales
  add constraint pos_sales_sale_number_key unique (sale_number);

alter sequence public.pos_sales_number_seq owned by public.pos_sales.sale_number;

create table if not exists public.pos_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.pos_sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete restrict,
  work_order_id uuid references public.work_orders(id) on delete restrict,
  description text,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pos_item_product_or_workorder check (
    (product_id is not null and work_order_id is null) or
    (product_id is null and work_order_id is not null)
  )
);
create index if not exists idx_pos_items_sale on public.pos_sale_items(sale_id);
create index if not exists idx_pos_items_product on public.pos_sale_items(product_id);
create index if not exists idx_pos_items_workorder on public.pos_sale_items(work_order_id);
alter table public.pos_sale_items enable row level security;

-- Función genérica de actualización de updated_at ya existe: public.set_timestamp_updated_at
-- Activar triggers de updated_at en nuevas tablas
drop trigger if exists trg_products_set_updated on public.products;
create trigger trg_products_set_updated
before update on public.products
for each row execute function public.set_timestamp_updated_at();

drop trigger if exists trg_suppliers_set_updated on public.suppliers;
create trigger trg_suppliers_set_updated
before update on public.suppliers
for each row execute function public.set_timestamp_updated_at();

drop trigger if exists trg_purchase_set_updated on public.purchase_invoices;
create trigger trg_purchase_set_updated
before update on public.purchase_invoices
for each row execute function public.set_timestamp_updated_at();

drop trigger if exists trg_purchase_items_set_updated on public.purchase_items;
create trigger trg_purchase_items_set_updated
before update on public.purchase_items
for each row execute function public.set_timestamp_updated_at();

drop trigger if exists trg_pos_sales_set_updated on public.pos_sales;
create trigger trg_pos_sales_set_updated
before update on public.pos_sales
for each row execute function public.set_timestamp_updated_at();

drop trigger if exists trg_pos_items_set_updated on public.pos_sale_items;
create trigger trg_pos_items_set_updated
before update on public.pos_sale_items
for each row execute function public.set_timestamp_updated_at();

-- Recalcular total de compra
create or replace function public.recalc_purchase_total()
returns trigger as $$
declare
  pid uuid;
begin
  pid := coalesce(NEW.purchase_id, OLD.purchase_id);
  update public.purchase_invoices p
  set total = coalesce((
    select sum(i.quantity * i.unit_cost)
    from public.purchase_items i
    where i.purchase_id = p.id
  ), 0)
  where p.id = pid;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_purchase_total_ins on public.purchase_items;
drop trigger if exists trg_purchase_total_upd on public.purchase_items;
drop trigger if exists trg_purchase_total_del on public.purchase_items;

create trigger trg_purchase_total_ins
after insert on public.purchase_items
for each row execute function public.recalc_purchase_total();

create trigger trg_purchase_total_upd
after update on public.purchase_items
for each row execute function public.recalc_purchase_total();

create trigger trg_purchase_total_del
after delete on public.purchase_items
for each row execute function public.recalc_purchase_total();

-- Recalcular total de venta POS
create or replace function public.recalc_pos_sale_total()
returns trigger as $$
declare
  sid uuid;
begin
  sid := coalesce(NEW.sale_id, OLD.sale_id);
  update public.pos_sales s
  set total = coalesce((
    select sum(si.quantity * si.unit_price)
    from public.pos_sale_items si
    where si.sale_id = s.id
  ), 0)
  where s.id = sid;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_pos_total_ins on public.pos_sale_items;
drop trigger if exists trg_pos_total_upd on public.pos_sale_items;
drop trigger if exists trg_pos_total_del on public.pos_sale_items;

create trigger trg_pos_total_ins
after insert on public.pos_sale_items
for each row execute function public.recalc_pos_sale_total();

create trigger trg_pos_total_upd
after update on public.pos_sale_items
for each row execute function public.recalc_pos_sale_total();

create trigger trg_pos_total_del
after delete on public.pos_sale_items
for each row execute function public.recalc_pos_sale_total();

-- Al recibir una compra, generar movimientos de inventario (entrada)
create or replace function public.generate_movements_on_purchase_receive()
returns trigger as $$
begin
  if NEW.status = 'received' and (OLD.status is distinct from NEW.status) then
    insert into public.inventory_movements (product_id, movement_type, quantity, unit_cost, source, source_id)
    select i.product_id, 'in', i.quantity, i.unit_cost, 'purchase', NEW.id
    from public.purchase_items i
    where i.purchase_id = NEW.id;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_purchase_receive_movements on public.purchase_invoices;
create trigger trg_purchase_receive_movements
after update on public.purchase_invoices
for each row execute function public.generate_movements_on_purchase_receive();

-- Al marcar venta como pagada, generar movimientos de inventario (salida) para productos
create or replace function public.generate_movements_on_pos_paid()
returns trigger as $$
begin
  if NEW.status = 'paid' and (OLD.status is distinct from NEW.status) then
    -- Evitar duplicados si ya existen movimientos para esta venta
    if not exists (select 1 from public.inventory_movements m where m.source = 'sale' and m.source_id = NEW.id) then
      insert into public.inventory_movements (product_id, movement_type, quantity, unit_cost, source, source_id)
      select si.product_id, 'out', si.quantity, 0, 'sale', NEW.id
      from public.pos_sale_items si
      where si.sale_id = NEW.id and si.product_id is not null;
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_pos_paid_movements on public.pos_sales;
create trigger trg_pos_paid_movements
after update on public.pos_sales
for each row execute function public.generate_movements_on_pos_paid();

-- Políticas RLS mínimas (ajustar según seguridad deseada)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='suppliers' and policyname='anon_select_suppliers') then
    create policy anon_select_suppliers on public.suppliers for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='suppliers' and policyname='anon_modify_suppliers') then
    create policy anon_modify_suppliers on public.suppliers for all to anon using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='anon_select_products') then
    create policy anon_select_products on public.products for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='anon_modify_products') then
    create policy anon_modify_products on public.products for all to anon using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='inventory_movements' and policyname='anon_select_inv_mov') then
    create policy anon_select_inv_mov on public.inventory_movements for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='purchase_invoices' and policyname='anon_select_purchases') then
    create policy anon_select_purchases on public.purchase_invoices for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='purchase_invoices' and policyname='anon_modify_purchases') then
    create policy anon_modify_purchases on public.purchase_invoices for all to anon using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='purchase_items' and policyname='anon_select_purchase_items') then
    create policy anon_select_purchase_items on public.purchase_items for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='purchase_items' and policyname='anon_modify_purchase_items') then
    create policy anon_modify_purchase_items on public.purchase_items for all to anon using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pos_sales' and policyname='anon_select_pos_sales') then
    create policy anon_select_pos_sales on public.pos_sales for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pos_sales' and policyname='anon_modify_pos_sales') then
    create policy anon_modify_pos_sales on public.pos_sales for all to anon using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pos_sale_items' and policyname='anon_select_pos_items') then
    create policy anon_select_pos_items on public.pos_sale_items for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pos_sale_items' and policyname='anon_modify_pos_items') then
    create policy anon_modify_pos_items on public.pos_sale_items for all to anon using (true) with check (true);
  end if;
end $$;

commit;