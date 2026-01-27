-- Hacer opcional el campo service_id en work_orders
alter table public.work_orders
  alter column service_id drop not null;

-- Opcional: mantener índice existente; los valores NULL son permitidos en índices B-Tree
-- create index concurrently if not exists idx_work_orders_service on public.work_orders(service_id);