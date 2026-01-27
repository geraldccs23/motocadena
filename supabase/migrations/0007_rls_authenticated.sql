-- RLS y políticas para usuarios autenticados
-- Este script es idempotente y puede ejecutarse varias veces con seguridad.

-- Asegurar columna de enlace con Auth (por si 0005 no se aplicó)
alter table public.users add column if not exists auth_user_id uuid unique;

-- Habilitar RLS en todas las tablas
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.work_orders enable row level security;

-- Eliminar políticas amplias de anon (si existen)
do $$ begin
  if exists (select 1 from pg_policy where polname = 'anon_select_users') then
    drop policy anon_select_users on public.users;
  end if;
  if exists (select 1 from pg_policy where polname = 'anon_modify_users') then
    drop policy anon_modify_users on public.users;
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'anon_select_clients') then
    drop policy anon_select_clients on public.clients;
  end if;
  if exists (select 1 from pg_policy where polname = 'anon_modify_clients') then
    drop policy anon_modify_clients on public.clients;
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'anon_select_services') then
    drop policy anon_select_services on public.services;
  end if;
  if exists (select 1 from pg_policy where polname = 'anon_modify_services') then
    drop policy anon_modify_services on public.services;
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'anon_select_work_orders') then
    drop policy anon_select_work_orders on public.work_orders;
  end if;
  if exists (select 1 from pg_policy where polname = 'anon_modify_work_orders') then
    drop policy anon_modify_work_orders on public.work_orders;
  end if;
end $$;

-- USERS: permitir a usuarios autenticados gestionar su propio perfil
-- 1) Por auth_user_id (robusto)
do $$ begin
  if not exists (select 1 from pg_policy where polname = 'authenticated_manage_own_user_uid') then
    create policy authenticated_manage_own_user_uid on public.users
      for all to authenticated
      using (auth_user_id = auth.uid())
      with check (auth_user_id = auth.uid());
  end if;
end $$;

-- 2) Fallback por email (por si aún no está enlazado el auth_user_id)
do $$ begin
  if not exists (select 1 from pg_policy where polname = 'authenticated_manage_own_user_email') then
    create policy authenticated_manage_own_user_email on public.users
      for all to authenticated
      using (email = auth.jwt()->>'email')
      with check (email = auth.jwt()->>'email');
  end if;
end $$;

-- SERVICES: lectura para autenticados
do $$ begin
  if not exists (select 1 from pg_policy where polname = 'authenticated_select_services') then
    create policy authenticated_select_services on public.services
      for select to authenticated
      using (true);
  end if;
end $$;

-- CLIENTS: lectura y escritura para autenticados
do $$ begin
  if not exists (select 1 from pg_policy where polname = 'authenticated_select_clients') then
    create policy authenticated_select_clients on public.clients
      for select to authenticated
      using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policy where polname = 'authenticated_insert_clients') then
    create policy authenticated_insert_clients on public.clients
      for insert to authenticated
      with check (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policy where polname = 'authenticated_update_clients') then
    create policy authenticated_update_clients on public.clients
      for update to authenticated
      using (true)
      with check (true);
  end if;
end $$;

-- WORK_ORDERS: lectura y escritura para autenticados
do $$ begin
  if not exists (select 1 from pg_policy where polname = 'authenticated_select_work_orders') then
    create policy authenticated_select_work_orders on public.work_orders
      for select to authenticated
      using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policy where polname = 'authenticated_insert_work_orders') then
    create policy authenticated_insert_work_orders on public.work_orders
      for insert to authenticated
      with check (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policy where polname = 'authenticated_update_work_orders') then
    create policy authenticated_update_work_orders on public.work_orders
      for update to authenticated
      using (true)
      with check (true);
  end if;
end $$;