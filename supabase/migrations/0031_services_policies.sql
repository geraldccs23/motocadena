-- Habilitar escritura de servicios para usuarios autenticados
-- Idempotente: puede ejecutarse múltiples veces de forma segura

alter table public.services enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'services' and policyname = 'authenticated_insert_services'
  ) then
    create policy authenticated_insert_services on public.services
      for insert to authenticated
      with check (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'services' and policyname = 'authenticated_update_services'
  ) then
    create policy authenticated_update_services on public.services
      for update to authenticated
      using (true)
      with check (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'services' and policyname = 'authenticated_delete_services'
  ) then
    create policy authenticated_delete_services on public.services
      for delete to authenticated
      using (true);
  end if;
end $$;

-- Actualizar updated_at automáticamente en updates
drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at before update on public.services
for each row execute procedure public.set_updated_at();