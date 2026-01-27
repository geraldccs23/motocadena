-- 0009_memberships.sql
-- Crea tablas para planes de membresía y membresías de clientes

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'membership_status'
  ) THEN
    CREATE TYPE membership_status AS ENUM ('active', 'expired', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  services_per_month integer NOT NULL DEFAULT 2,
  max_service_minutes integer NOT NULL DEFAULT 45,
  monthly_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.membership_plans(id) ON DELETE RESTRICT,
  status membership_status NOT NULL DEFAULT 'active',
  start_date date NOT NULL DEFAULT current_date,
  end_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memberships_client_id_idx ON public.memberships(client_id);
-- Unicidad sólo para membresías activas (constraint parcial no existe; usar índice parcial)
CREATE UNIQUE INDEX IF NOT EXISTS memberships_active_unique
  ON public.memberships (client_id, plan_id)
  WHERE status = 'active';

-- Habilitar RLS
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- Políticas: autenticados pueden ver planes; admins podrían modificarlos luego (por ahora todos autenticados)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'membership_plans' AND policyname = 'membership_plans_authenticated_select'
  ) THEN
    DROP POLICY membership_plans_authenticated_select ON public.membership_plans;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'membership_plans' AND policyname = 'membership_plans_authenticated_modify'
  ) THEN
    DROP POLICY membership_plans_authenticated_modify ON public.membership_plans;
  END IF;

  CREATE POLICY membership_plans_authenticated_select
    ON public.membership_plans FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY membership_plans_authenticated_modify
    ON public.membership_plans FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
END $$;

-- Políticas para memberships
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'memberships' AND policyname = 'memberships_authenticated_select'
  ) THEN
    DROP POLICY memberships_authenticated_select ON public.memberships;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'memberships' AND policyname = 'memberships_authenticated_modify'
  ) THEN
    DROP POLICY memberships_authenticated_modify ON public.memberships;
  END IF;

  CREATE POLICY memberships_authenticated_select
    ON public.memberships FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY memberships_authenticated_modify
    ON public.memberships FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
END $$;