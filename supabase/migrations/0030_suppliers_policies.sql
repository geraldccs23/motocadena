-- 0030_suppliers_policies.sql
-- Políticas RLS para la tabla de proveedores

begin;

-- Asegurar RLS
alter table if exists public.suppliers enable row level security;

-- Lectura para usuarios autenticados
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'suppliers' and policyname = 'authenticated_select_suppliers'
  ) then
    create policy authenticated_select_suppliers
      on public.suppliers
      for select to authenticated
      using (true);
  end if;
end $$;

-- Inserción para usuarios autenticados
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'suppliers' and policyname = 'authenticated_insert_suppliers'
  ) then
    create policy authenticated_insert_suppliers
      on public.suppliers
      for insert to authenticated
      with check (true);
  end if;
end $$;

-- Actualización para usuarios autenticados
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'suppliers' and policyname = 'authenticated_update_suppliers'
  ) then
    create policy authenticated_update_suppliers
      on public.suppliers
      for update to authenticated
      using (true)
      with check (true);
  end if;
end $$;

-- Opcional: lectura para anon (por si quieres listar sin login)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'suppliers' and policyname = 'anon_select_suppliers'
  ) then
    create policy anon_select_suppliers
      on public.suppliers
      for select to anon
      using (true);
  end if;
end $$;

commit;