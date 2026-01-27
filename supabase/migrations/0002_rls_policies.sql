-- Habilitar RLS
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.work_orders enable row level security;

-- Políticas amplias para mantener funcionalidad actual (ajustar en producción)
-- USERS
do $$ begin
  if not exists (select 1 from pg_policy where polname = 'anon_select_users') then
    create policy anon_select_users on public.users for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policy where polname = 'anon_modify_users') then
    create policy anon_modify_users on public.users for all to anon using (true) with check (true);
  end if;
end $$;

-- CLIENTS
do $$ begin
  if not exists (select 1 from pg_policy where polname = 'anon_select_clients') then
    create policy anon_select_clients on public.clients for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policy where polname = 'anon_modify_clients') then
    create policy anon_modify_clients on public.clients for all to anon using (true) with check (true);
  end if;
end $$;

-- SERVICES
do $$ begin
  if not exists (select 1 from pg_policy where polname = 'anon_select_services') then
    create policy anon_select_services on public.services for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policy where polname = 'anon_modify_services') then
    create policy anon_modify_services on public.services for all to anon using (true) with check (true);
  end if;
end $$;

-- WORK_ORDERS
do $$ begin
  if not exists (select 1 from pg_policy where polname = 'anon_select_work_orders') then
    create policy anon_select_work_orders on public.work_orders for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policy where polname = 'anon_modify_work_orders') then
    create policy anon_modify_work_orders on public.work_orders for all to anon using (true) with check (true);
  end if;
end $$;