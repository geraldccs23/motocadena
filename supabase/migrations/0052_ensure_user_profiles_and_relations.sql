-- MIGRACIÓN DE EMERGENCIA: REPARACIÓN DE ESQUEMA V2.0
-- Asegura que existan las tablas y relaciones necesarias para el nuevo código comercial.

-- 1. ASEGURAR TABLA DE PERFILES DE USUARIO
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    workshop_id UUID, -- Referencia opcional a workshops
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'VENDEDOR',
    is_active BOOLEAN DEFAULT true,
    commission_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ASEGURAR COLUMNAS EN WORK_ORDERS (POR SI ACASO)
ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS initial_inspection JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS final_inspection JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS workshop_id UUID;

-- 3. RE-VINCULAR CLAVES FORÁNEAS PARA QUE POSTGREST (SUPABASE) DETECTE LAS RELACIONES
-- Esto es crítico para el select=*,mechanic:user_profiles!mechanic_id(*)
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_mechanic_id_fkey;
ALTER TABLE public.work_orders 
    ADD CONSTRAINT work_orders_mechanic_id_fkey 
    FOREIGN KEY (mechanic_id) 
    REFERENCES public.user_profiles(id);

ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_advisor_id_fkey;
ALTER TABLE public.work_orders 
    ADD CONSTRAINT work_orders_advisor_id_fkey 
    FOREIGN KEY (advisor_id) 
    REFERENCES public.user_profiles(id);

-- 4. PERMISOS RLS BÁSICOS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to profiles" ON public.user_profiles;
CREATE POLICY "Public access to profiles" ON public.user_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin update profiles" ON public.user_profiles;
CREATE POLICY "Admin update profiles" ON public.user_profiles FOR UPDATE USING (true); -- Simplificado para desarrollo
