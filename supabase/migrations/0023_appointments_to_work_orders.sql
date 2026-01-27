-- Crear orden de trabajo automáticamente al confirmar una cita

-- Enlazar órdenes con citas para evitar duplicados y facilitar auditoría
alter table public.work_orders
  add column if not exists appointment_id uuid unique references public.appointments(id) on delete set null;

create or replace function public.create_work_order_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_order uuid;
  svc_price numeric(10,2);
begin
  -- Solo actuar cuando cambia el estado a 'confirmed'
  if NEW.status = 'confirmed' and (OLD.status is distinct from NEW.status) then
    -- Evitar duplicados si ya existe orden para esta cita
    select id into existing_order from public.work_orders where appointment_id = NEW.id;

    if existing_order is null then
      -- Crear la orden base
      insert into public.work_orders (client_id, service_id, assigned_mechanic_id, notes, status, appointment_id)
      values (NEW.client_id, NEW.service_id, NEW.assigned_mechanic_id, NEW.notes, 'pending', NEW.id)
      returning id into existing_order;

      -- Agregar detalle de servicio con precio base si hay service_id
      if NEW.service_id is not null then
        select s.base_price into svc_price from public.services s where s.id = NEW.service_id;
        insert into public.work_order_services (work_order_id, service_id, quantity, unit_price, notes)
        values (existing_order, NEW.service_id, 1, coalesce(svc_price, 0), NEW.notes);
      end if;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_appt_to_order on public.appointments;
create trigger trg_appt_to_order
after update on public.appointments
for each row execute function public.create_work_order_on_confirm();