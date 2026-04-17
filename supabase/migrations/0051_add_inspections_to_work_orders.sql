-- Añadir columnas de inspección que faltaban en la v2.0
ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS initial_inspection JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS final_inspection JSONB DEFAULT '{}';

COMMENT ON COLUMN public.work_orders.initial_inspection IS 'Estado de la moto al ingresar (luces, frenos, cauchos, etc)';
COMMENT ON COLUMN public.work_orders.final_inspection IS 'Estado de la moto al salir del taller';
