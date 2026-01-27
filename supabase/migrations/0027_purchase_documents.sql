begin;

alter table if exists public.purchase_invoices
  add column if not exists document_type text check (document_type in ('invoice','delivery_note'));

alter table if exists public.purchase_invoices
  add column if not exists invoice_number text;

alter table if exists public.purchase_invoices
  add column if not exists control_number text;

alter table if exists public.purchase_invoices
  add column if not exists document_date date;

alter table if exists public.purchase_invoices
  add column if not exists received_at timestamptz;

commit;
