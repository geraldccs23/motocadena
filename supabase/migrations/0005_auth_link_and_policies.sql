-- Agrega columna para enlazar usuarios de aplicación con Supabase Auth
alter table public.users add column if not exists auth_user_id uuid unique;

-- Política para que usuarios autenticados gestionen su propio perfil
do $$ begin
  if not exists (select 1 from pg_policy where polname = 'authenticated_manage_own_user') then
    create policy authenticated_manage_own_user on public.users
      for all to authenticated
      using (auth_user_id = auth.uid())
      with check (auth_user_id = auth.uid());
  end if;
end $$;

-- Permitir a authenticated leer servicios y crear clientes/órdenes
do $$ begin
  if not exists (select 1 from pg_policy where polname = 'authenticated_select_services') then
    create policy authenticated_select_services on public.services for select to authenticated using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policy where polname = 'authenticated_insert_clients') then
    create policy authenticated_insert_clients on public.clients for insert to authenticated with check (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policy where polname = 'authenticated_insert_work_orders') then
    create policy authenticated_insert_work_orders on public.work_orders for insert to authenticated with check (true);
  end if;
end $$;