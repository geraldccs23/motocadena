-- Políticas RLS para rol anon en tablas nuevas
-- Motivo: el frontend actualmente usa la anon key sin sesión de Supabase Auth.
-- PostgREST devuelve 404 cuando no hay políticas para el rol activo.

-- appointments
alter table public.appointments enable row level security;

drop policy if exists anon_select_appointments on public.appointments;
create policy anon_select_appointments on public.appointments
for select to anon using (true);

drop policy if exists anon_insert_appointments on public.appointments;
create policy anon_insert_appointments on public.appointments
for insert to anon with check (true);

drop policy if exists anon_update_appointments on public.appointments;
create policy anon_update_appointments on public.appointments
for update to anon using (true) with check (true);

drop policy if exists anon_delete_appointments on public.appointments;
create policy anon_delete_appointments on public.appointments
for delete to anon using (true);

-- membership_plans
alter table public.membership_plans enable row level security;

drop policy if exists anon_select_membership_plans on public.membership_plans;
create policy anon_select_membership_plans on public.membership_plans
for select to anon using (true);

drop policy if exists anon_modify_membership_plans on public.membership_plans;
create policy anon_modify_membership_plans on public.membership_plans
for all to anon using (true) with check (true);

-- client_memberships
alter table public.client_memberships enable row level security;

drop policy if exists anon_select_client_memberships on public.client_memberships;
create policy anon_select_client_memberships on public.client_memberships
for select to anon using (true);

drop policy if exists anon_modify_client_memberships on public.client_memberships;
create policy anon_modify_client_memberships on public.client_memberships
for all to anon using (true) with check (true);

-- Nota: endurecer estas políticas en producción y usar Supabase Auth para evitar acceso amplio con anon.