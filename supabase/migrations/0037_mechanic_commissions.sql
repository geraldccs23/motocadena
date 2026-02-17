-- Migration 0037: Add commission_rate to user_profiles
-- Adds a numeric field to store the commission percentage for mechanics

do $$ 
begin
    if not exists (select 1 from INFORMATION_SCHEMA.COLUMNS where table_name = 'user_profiles' and column_name = 'commission_rate') then
        alter table public.user_profiles add column commission_rate numeric not null default 0.0;
    end if;
end $$;

-- Update comment for the column
comment on column public.user_profiles.commission_rate is 'Porcentaje de comisión sobre servicios (0-100)';
