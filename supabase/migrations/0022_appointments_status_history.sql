-- Historial de cambios de estado en citas
create table if not exists public.appointment_status_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_at timestamptz not null default now()
);

create index if not exists idx_ash_appt on public.appointment_status_history(appointment_id);

alter table public.appointment_status_history enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'appointment_status_history'
  ) then
    create policy authenticated_select_ash on public.appointment_status_history
      for select to authenticated using (true);
    create policy authenticated_insert_ash on public.appointment_status_history
      for insert to authenticated with check (true);
  end if;
end $$;

create or replace function public.log_appointment_status_change()
returns trigger as $$
begin
  if NEW.status is distinct from OLD.status then
    insert into public.appointment_status_history(appointment_id, from_status, to_status)
    values (OLD.id, OLD.status, NEW.status);
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_log_appt_status on public.appointments;
create trigger trg_log_appt_status
after update on public.appointments
for each row execute function public.log_appointment_status_change();