-- Ensure RPC functions are visible and run with definer privileges
do $$
begin
  -- Set SECURITY DEFINER and search_path to prevent privilege/search issues
  begin
    alter function public.create_user(text, text, text, text, text, text)
      security definer
      set search_path = public, pgcrypto;
  exception when undefined_function then
    -- Function not created yet; skip
    null;
  end;

  begin
    alter function public.update_user_password(uuid, text)
      security definer
      set search_path = public, pgcrypto;
  exception when undefined_function then
    -- Function not created yet; skip
    null;
  end;

  -- Grant execution to roles used by the API
  begin
    grant execute on function public.create_user(text, text, text, text, text, text)
      to anon, authenticated, service_role;
  exception when undefined_function then null; end;

  begin
    grant execute on function public.update_user_password(uuid, text)
      to anon, authenticated, service_role;
  exception when undefined_function then null; end;

  -- Force PostgREST to reload schema cache
  perform pg_notify('pgrst', 'reload schema');
end $$;