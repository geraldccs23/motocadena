-- Tabla de Citas (Agendamiento)
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  assigned_mechanic_id uuid references public.mechanics(id) on delete set null,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 60,
  status text not null default 'scheduled' check (status in ('scheduled','confirmed','completed','cancelled')),
  notes text,
  total numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices útiles
create index if not exists idx_appointments_client on public.appointments(client_id);
create index if not exists idx_appointments_mechanic on public.appointments(assigned_mechanic_id);
create index if not exists idx_appointments_scheduled_at on public.appointments(scheduled_at);

-- Trigger para updated_at
create or replace function public.set_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_appointments_set_updated on public.appointments;
create trigger trg_appointments_set_updated
before update on public.appointments
for each row execute function public.set_timestamp_updated_at();

-- Si hay service_id, inicializar total con el precio base del servicio al insertar
create or replace function public.appointments_init_total()
returns trigger as $$
declare
  base_price numeric(10,2);
begin
  if new.service_id is not null and (new.total is null or new.total = 0) then
    select s.base_price into base_price from public.services s where s.id = new.service_id;
    if base_price is not null then
      new.total = base_price;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_appointments_init_total on public.appointments;
create trigger trg_appointments_init_total
before insert on public.appointments
for each row execute function public.appointments_init_total();

-- RLS
alter table public.appointments enable row level security;

-- Políticas para usuarios autenticados
drop policy if exists authenticated_select_appointments on public.appointments;
create policy authenticated_select_appointments on public.appointments
for select
to authenticated
using (true);

drop policy if exists authenticated_insert_appointments on public.appointments;
create policy authenticated_insert_appointments on public.appointments
for insert
to authenticated
with check (true);

drop policy if exists authenticated_update_appointments on public.appointments;
create policy authenticated_update_appointments on public.appointments
for update
to authenticated
using (true)
with check (true);

drop policy if exists authenticated_delete_appointments on public.appointments;
create policy authenticated_delete_appointments on public.appointments
for delete
to authenticated
using (true);