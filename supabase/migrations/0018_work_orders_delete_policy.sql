-- Permitir DELETE en work_orders para usuarios autenticados
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'work_orders' and policyname = 'authenticated_delete_work_orders'
  ) then
    create policy authenticated_delete_work_orders on public.work_orders
      for delete to authenticated using (true);
  end if;
end $$;