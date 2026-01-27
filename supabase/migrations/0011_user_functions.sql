-- Ensure pgcrypto is available for password hashing
  create extension if not exists pgcrypto;

  -- RPC: Crear usuario de gestión (perfil en tabla users)
  create or replace function public.create_user(
    p_email text,
    p_full_name text,
    p_password text,
    p_phone text,
    p_role text,
    p_username text
  )
  returns public.users
  language plpgsql
  as $$
  declare
    new_user public.users;
  begin
  insert into public.users (email, full_name, username, role, phone, status, password_hash)
  values (
      p_email,
      coalesce(p_full_name, split_part(p_email, '@', 1)),
      coalesce(p_username, p_email),
      coalesce(p_role, 'mechanic'),
      nullif(p_phone, ''),
      'active',
    case when p_password is not null and length(p_password) > 0 then pgcrypto.crypt(p_password, pgcrypto.gen_salt('bf')) else null end
  )
  returning * into new_user;

    return new_user;
  end;
  $$;

  -- RPC: Actualizar la contraseña (hash en tabla users)
  create or replace function public.update_user_password(
    user_id uuid,
    new_password text
  )
  returns public.users
  language plpgsql
  as $$
  declare
    updated_user public.users;
  begin
  update public.users
  set password_hash = pgcrypto.crypt(new_password, pgcrypto.gen_salt('bf'))
  where id = user_id
  returning * into updated_user;

    return updated_user;
  end;
  $$;