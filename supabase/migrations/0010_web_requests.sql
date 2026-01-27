-- 0010_web_requests.sql
-- Crea tabla para solicitudes web públicas y define RLS para permitir INSERT desde rol anon,
-- y lectura/gestión desde rol authenticated. También habilita lectura pública de services.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'web_request_status'
  ) THEN
    CREATE TYPE web_request_status AS ENUM ('new', 'contacted', 'scheduled', 'closed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.web_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  vehicle_brand text,
  vehicle_model text,
  service_id uuid REFERENCES public.services(id),
  notes text,
  source text NOT NULL DEFAULT 'web', -- 'web' | 'whatsapp' | otros
  status web_request_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.web_requests ENABLE ROW LEVEL SECURITY;

-- Políticas: permitir INSERT a anon con chequeos simples; autenticados pueden gestionar.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'web_requests' AND policyname = 'web_requests_anon_insert'
  ) THEN
    DROP POLICY web_requests_anon_insert ON public.web_requests;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'web_requests' AND policyname = 'web_requests_authenticated_select'
  ) THEN
    DROP POLICY web_requests_authenticated_select ON public.web_requests;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'web_requests' AND policyname = 'web_requests_authenticated_modify'
  ) THEN
    DROP POLICY web_requests_authenticated_modify ON public.web_requests;
  END IF;

  CREATE POLICY web_requests_anon_insert
    ON public.web_requests FOR INSERT
    TO anon
    WITH CHECK (
      full_name IS NOT NULL
    );

  CREATE POLICY web_requests_authenticated_select
    ON public.web_requests FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY web_requests_authenticated_modify
    ON public.web_requests FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
END $$;

-- Servicios deben ser visibles en la web pública
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY; -- por si aún no estaba
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'services' AND policyname = 'services_anon_select'
  ) THEN
    DROP POLICY services_anon_select ON public.services;
  END IF;
  CREATE POLICY services_anon_select
    ON public.services FOR SELECT
    TO anon
    USING (true);
END $$;