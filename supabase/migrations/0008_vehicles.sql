-- 0008_vehicles.sql
-- Crea tabla de vehículos por cliente, manteniendo compatibilidad con columnas actuales en clients
-- y define RLS para acceso autenticado.

-- Crear tipo opcional para vehicle_status si se desea en el futuro (no usado ahora)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'vehicle_status'
  ) THEN
    CREATE TYPE vehicle_status AS ENUM ('active', 'inactive');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plate text,
  brand text,
  model text,
  year integer,
  vin text,
  status vehicle_status DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS vehicles_client_id_idx ON public.vehicles(client_id);
CREATE UNIQUE INDEX IF NOT EXISTS vehicles_plate_unique ON public.vehicles(plate) WHERE plate IS NOT NULL;

-- Habilitar RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Políticas: autenticados pueden leer/crear/editar vehículos
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vehicles' AND policyname = 'vehicles_authenticated_select'
  ) THEN
    DROP POLICY vehicles_authenticated_select ON public.vehicles;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vehicles' AND policyname = 'vehicles_authenticated_modify'
  ) THEN
    DROP POLICY vehicles_authenticated_modify ON public.vehicles;
  END IF;

  CREATE POLICY vehicles_authenticated_select
    ON public.vehicles FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY vehicles_authenticated_modify
    ON public.vehicles FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
END $$;

-- Nota: Propiedad por usuario aún no está modelada; se permitirá a autenticados gestionar todos los vehículos.
-- En una próxima iteración, se puede agregar ownership por usuario mediante relaciones con users/auth_user_id.