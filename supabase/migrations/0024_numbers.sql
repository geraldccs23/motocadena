-- Add sequential numbers for appointments and work orders
begin;

-- Appointments numbering
create sequence if not exists public.appointments_number_seq;

alter table public.appointments
  add column if not exists appointment_number bigint;

alter table public.appointments
  alter column appointment_number set default nextval('public.appointments_number_seq'::regclass);

with to_fill as (
  select id from public.appointments where appointment_number is null order by created_at, id
)
update public.appointments a
set appointment_number = nextval('public.appointments_number_seq'::regclass)
from to_fill tf
where a.id = tf.id;

alter table public.appointments
  alter column appointment_number set not null;

alter table public.appointments
  add constraint appointments_appointment_number_key unique (appointment_number);

alter sequence public.appointments_number_seq owned by public.appointments.appointment_number;

-- Work orders numbering
create sequence if not exists public.work_orders_number_seq;

alter table public.work_orders
  add column if not exists order_number bigint;

alter table public.work_orders
  alter column order_number set default nextval('public.work_orders_number_seq'::regclass);

with to_fill_wo as (
  select id from public.work_orders where order_number is null order by created_at, id
)
update public.work_orders w
set order_number = nextval('public.work_orders_number_seq'::regclass)
from to_fill_wo tf
where w.id = tf.id;

alter table public.work_orders
  alter column order_number set not null;

alter table public.work_orders
  add constraint work_orders_order_number_key unique (order_number);

alter sequence public.work_orders_number_seq owned by public.work_orders.order_number;

commit;