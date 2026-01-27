-- Mejora POS: pagos múltiples, cliente en ventas y servicios creados
-- Ejecutar en Supabase (CLI o Editor SQL) antes de usar las nuevas funciones

-- 1) Cliente en ventas POS
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='pos_sales' and column_name='client_id'
  ) then
    alter table public.pos_sales
      add column client_id uuid references public.clients(id) on delete set null;
    create index if not exists idx_pos_sales_client on public.pos_sales(client_id);
  end if;
end $$;

-- 2) Tabla de pagos de venta POS (para pagos mixtos)
create table if not exists public.pos_sale_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.pos_sales(id) on delete cascade,
  method text not null check (method in ('cash','card','transfer')),
  amount numeric(10,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_pos_payments_sale on public.pos_sale_payments(sale_id);
alter table public.pos_sale_payments enable row level security;

-- Políticas básicas para permitir lectura/escritura (ajustar a seguridad deseada)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pos_sale_payments' and policyname='anon_select_pos_payments') then
    create policy anon_select_pos_payments on public.pos_sale_payments for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pos_sale_payments' and policyname='anon_modify_pos_payments') then
    create policy anon_modify_pos_payments on public.pos_sale_payments for all to anon using (true) with check (true);
  end if;
end $$;

-- 3) Servicios creados en items POS
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='pos_sale_items' and column_name='service_id'
  ) then
    alter table public.pos_sale_items
      add column service_id uuid references public.services(id) on delete restrict;
  end if;
  -- Ajustar la restricción para permitir uno de: product_id, service_id, work_order_id
  if exists (
    select 1 from information_schema.constraint_column_usage where table_schema='public' and table_name='pos_sale_items' and constraint_name='pos_item_product_or_workorder'
  ) then
    alter table public.pos_sale_items drop constraint pos_item_product_or_workorder;
  end if;
  -- Nueva restricción
  alter table public.pos_sale_items
    add constraint pos_item_product_service_or_workorder check (
      (product_id is not null and service_id is null and work_order_id is null) or
      (product_id is null and service_id is not null and work_order_id is null) or
      (product_id is null and service_id is null and work_order_id is not null)
    );
end $$;

-- 4) Vista rápida: total pagado por venta
create or replace view public.v_pos_sales_paid as
select s.id as sale_id,
       coalesce(sum(p.amount), 0) as paid_amount
from public.pos_sales s
left join public.pos_sale_payments p on p.sale_id = s.id
group by s.id;