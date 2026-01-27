-- 0029_products_policies.sql
-- Políticas RLS para permitir gestión de productos por usuarios autenticados

begin;

-- Asegurar que la tabla products tenga RLS activado (ya debería estarlo en 0025)
alter table if exists public.products enable row level security;

-- Lectura para usuarios autenticados
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'products' and policyname = 'authenticated_select_products'
  ) then
    create policy authenticated_select_products
      on public.products
      for select to authenticated
      using (true);
  end if;
end $$;

-- Inserción para usuarios autenticados
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'products' and policyname = 'authenticated_insert_products'
  ) then
    create policy authenticated_insert_products
      on public.products
      for insert to authenticated
      with check (true);
  end if;
end $$;

-- Actualización para usuarios autenticados
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'products' and policyname = 'authenticated_update_products'
  ) then
    create policy authenticated_update_products
      on public.products
      for update to authenticated
      using (true)
      with check (true);
  end if;
end $$;

-- Opcional: lectura para anon (útil si deseas mostrar productos sin login)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'products' and policyname = 'anon_select_products'
  ) then
    create policy anon_select_products
      on public.products
      for select to anon
      using (true);
  end if;
end $$;

commit;