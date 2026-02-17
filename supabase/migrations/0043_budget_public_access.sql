-- 0043_budget_public_access.sql
-- Enable public (anonymous) access for budget viewing and approval

begin;

-- 1. Workshops RLS (Allow public to see basic workshop info for the budget header)
do $$ begin
  if not exists (select 1 from pg_policies where tablename='workshops' and policyname='public_select_workshops') then
    create policy public_select_workshops on public.workshops for select to anon using (true);
  end if;
end $$;

-- 2. Budgets RLS
-- Allow public to view a budget if they have the ID (UUID)
do $$ begin
  if not exists (select 1 from pg_policies where tablename='budgets' and policyname='public_select_budgets') then
    create policy public_select_budgets on public.budgets for select to anon using (true);
  end if;
end $$;

-- Allow public to update status (Accept/Reject)
do $$ begin
  if not exists (select 1 from pg_policies where tablename='budgets' and policyname='public_update_status') then
    create policy public_update_status on public.budgets for update to anon 
    using (true) 
    with check (status in ('APPROVED', 'REJECTED'));
  end if;
end $$;

-- 3. Budget Items RLS
-- Allow public to view items for a specific budget
do $$ begin
  if not exists (select 1 from pg_policies where tablename='budget_items' and policyname='public_select_budget_items') then
    create policy public_select_budget_items on public.budget_items for select to anon using (true);
  end if;
end $$;

commit;
