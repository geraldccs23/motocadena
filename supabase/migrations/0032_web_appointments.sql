begin;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'web_appointment_status'
  ) then
    create type web_appointment_status as enum ('new','scheduled','confirmed','cancelled','processed');
  end if;
end $$;

create table if not exists public.web_appointments (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  service_id uuid references public.services(id) on delete set null,
  desired_date date not null,
  slot_key text not null,
  notes text,
  status web_appointment_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint web_appointments_phone_format check (phone ~ '^[0-9]{11}$')
);

alter table public.web_appointments enable row level security;

do $$
begin
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'web_appointments' and policyname = 'web_appointments_anon_insert'
  ) then
    drop policy web_appointments_anon_insert on public.web_appointments;
  end if;
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'web_appointments' and policyname = 'web_appointments_authenticated_select'
  ) then
    drop policy web_appointments_authenticated_select on public.web_appointments;
  end if;
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'web_appointments' and policyname = 'web_appointments_authenticated_modify'
  ) then
    drop policy web_appointments_authenticated_modify on public.web_appointments;
  end if;

  create policy web_appointments_anon_insert
    on public.web_appointments for insert
    to anon
    with check (
      full_name is not null and
      phone ~ '^[0-9]{11}$' and
      desired_date is not null and
      slot_key is not null
    );

  create policy web_appointments_authenticated_select
    on public.web_appointments for select
    to authenticated
    using (true);

  create policy web_appointments_authenticated_modify
    on public.web_appointments for all
    to authenticated
    using (true)
    with check (true);
end $$;

drop trigger if exists trg_web_appointments_set_updated on public.web_appointments;
create trigger trg_web_appointments_set_updated
before update on public.web_appointments
for each row execute function public.set_timestamp_updated_at();

commit;
