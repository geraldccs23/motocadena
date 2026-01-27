-- Trigger para recalcular el total de la orden
create or replace function public.recalc_work_order_total()
returns trigger as $$
declare
  wid uuid;
begin
  wid := coalesce(NEW.work_order_id, OLD.work_order_id);
  update public.work_orders w
  set total = coalesce((
    select sum(s.quantity * s.unit_price)
    from public.work_order_services s
    where s.work_order_id = w.id
  ), 0)
  where w.id = wid;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_wos_recalc_total_ins on public.work_order_services;
drop trigger if exists trg_wos_recalc_total_upd on public.work_order_services;
drop trigger if exists trg_wos_recalc_total_del on public.work_order_services;

create trigger trg_wos_recalc_total_ins
after insert on public.work_order_services
for each row execute function public.recalc_work_order_total();

create trigger trg_wos_recalc_total_upd
after update on public.work_order_services
for each row execute function public.recalc_work_order_total();

create trigger trg_wos_recalc_total_del
after delete on public.work_order_services
for each row execute function public.recalc_work_order_total();