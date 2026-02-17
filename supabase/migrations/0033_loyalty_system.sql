-- Loyalty System Migration
-- This table will store referral progress for clients

create table if not exists public.loyalty_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references public.customers(id) on delete cascade,
  referrer_name text not null, -- Name for fallback if client_id is null
  referred_name text not null, -- Name of the friend being referred
  referred_phone text not null, -- Phone number of the friend
  status text not null default 'lead' check (status in ('lead', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fix for existing constraint if the table already existed with 'pending'
do $$ begin
  if exists (select 1 from pg_constraint where conname = 'loyalty_referrals_status_check') then
    alter table public.loyalty_referrals drop constraint loyalty_referrals_status_check;
  end if;
  alter table public.loyalty_referrals add constraint loyalty_referrals_status_check check (status in ('lead', 'completed'));
end $$;

-- RLS Policies
alter table public.loyalty_referrals enable row level security;

-- Allow anon to insert (simulating public registration)
create policy "Allow anon insert referrals" 
on public.loyalty_referrals for insert 
with check (true);

-- Allow authenticated users (staff) to manage referrals
create policy "Allow staff manage referrals" 
on public.loyalty_referrals for all 
using (auth.role() = 'authenticated');

-- Also allow public to view their own (simplified for this demo by showing all for now, 
-- but in production we'd filter by client_id or session)
create policy "Allow public view referrals" 
on public.loyalty_referrals for select 
using (true);
