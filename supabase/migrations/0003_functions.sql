-- Función de login basada en tabla users y pgcrypto
create or replace function public.login_user(p_username text, p_password text)
returns public.users
language plpgsql
as $$
declare
  u public.users;
begin
  select * into u from public.users where username = p_username and status = 'active' limit 1;
  if u.id is null then
    return null;
  end if;
  if u.password_hash is null then
    return null;
  end if;
  if u.password_hash = crypt(p_password, u.password_hash) then
    return u;
  else
    return null;
  end if;
end;
$$;

-- Triggers para updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at before update on public.users
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at before update on public.clients
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at before update on public.services
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_work_orders_updated_at on public.work_orders;
create trigger trg_work_orders_updated_at before update on public.work_orders
for each row execute procedure public.set_updated_at();