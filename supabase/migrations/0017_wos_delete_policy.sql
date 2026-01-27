-- Permitir DELETE en work_order_services para usuarios autenticados
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'work_order_services' and policyname = 'authenticated_delete_wos'
  ) then
    create policy authenticated_delete_wos on public.work_order_services
      for delete to authenticated using (true);
  end if;
end $$;