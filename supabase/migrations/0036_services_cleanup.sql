-- Migration 0036: Services Cleanup and Population
-- Adds missing columns, populates core services, and enables public access

-- 1. Add is_active column if it doesn't exist
do $$ 
begin
    if not exists (select 1 from INFORMATION_SCHEMA.COLUMNS where table_name = 'services' and column_name = 'is_active') then
        alter table public.services add column is_active boolean not null default true;
    end if;
end $$;

-- 2. Habilitar lectura pública (anon)
-- Sin esto, el sitio web público no puede ver los servicios
drop policy if exists anon_select_services on public.services;
create policy anon_select_services on public.services
for select to anon using (true);

-- 3. Insert Core Services
INSERT INTO public.services (name, description, price, estimated_duration_min, is_active)
VALUES 
-- Standard / Sport
('Mantenimiento General Motocicleta', 'Mantenimiento preventivo completo: cambio de aceite, limpieza de filtros, ajuste de frenos, bujía, lubricación y lavado.', 35.00, 150, true),
('Cambio de Aceite y Filtro (Standard)', 'Sustitución de aceite de motor y filtro original o reemplazo de alta calidad.', 15.00, 30, true),
('Servicio de Frenos (Standard)', 'Limpieza, ajuste y cambio de pastillas o bandas para sistema de frenado standard.', 12.00, 60, true),
('Limpieza de Inyectores / Carb (Standard)', 'Limpieza profunda del sistema de alimentación de combustible para optimizar consumo.', 25.00, 90, true),
('Ajuste y Lubricación de Cadena', 'Limpieza profunda del kit de arrastre, ajuste de tensión y lubricación profesional.', 10.00, 30, true),

-- Scooter
('Mantenimiento General Scooter', 'Revisión técnica integral para scooter, incluyendo fluidos, frenos y sistema eléctrico.', 30.00, 120, true),
('Mantenimiento CVT (Scooter)', 'Limpieza, engrase y revisión de variador, dados, embrague y correa de transmisión.', 25.00, 90, true),
('Cambio de Correa de Tracción (Scooter)', 'Sustitución de correa de transmisión automática y limpieza de caja CVT.', 20.00, 60, true),
('Aceite Motor y Transmisión (Scooter)', 'Cambio de ambos aceites (motor y caja reductora trasera) específicos para scooter.', 18.00, 45, true),
('Servicio de Frenos (Scooter)', 'Mantenimiento de frenos delanteros y traseros específicos para scooters automáticos.', 15.00, 60, true)
ON CONFLICT (name) DO UPDATE 
SET description = EXCLUDED.description, 
    price = EXCLUDED.price, 
    is_active = EXCLUDED.is_active;
