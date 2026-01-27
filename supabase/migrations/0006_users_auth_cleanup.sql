-- Hacer compatible la tabla users con Supabase Auth
-- 1) password_hash ya no es obligatorio porque usamos supabase.auth
alter table public.users alter column password_hash drop not null;

-- 2) (opcional) En entornos donde no se use username, se puede permitir null
-- alter table public.users alter column username drop not null;

-- 3) Índice único por email (si lo deseas, comenta si ya existe duplicidad)
do $$ begin
  if not exists (select 1 from pg_indexes where indexname = 'users_email_unique') then
    create unique index users_email_unique on public.users(email) where email is not null;
  end if;
end $$;