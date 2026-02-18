-- Migration 0048_sync_categories.sql
-- Updates the product categories to match the user's new distribution

BEGIN;

-- Insert or update categories based on the user's list
INSERT INTO public.product_categories (name, slug, is_active)
VALUES 
    ('Suspensión delantera', 'suspension-delantera', TRUE),
    ('Suspensión trasera', 'suspension-trasera', TRUE),
    ('Empacaduras', 'empacaduras', TRUE),
    ('Kit de arrastre', 'kit-de-arrastre', TRUE),
    ('Partes externas de motor', 'partes-externas-motor', TRUE),
    ('Partes internas de motor', 'partes-internas-motor', TRUE),
    ('Sistema de encendido', 'sistema-encendido', TRUE),
    ('Sistema de arranque', 'sistema-arranque', TRUE),
    ('Sistema de frenos', 'sistema-frenos', TRUE),
    ('Sistema de inyección', 'sistema-inyeccion', TRUE),
    ('Sistema de carburación', 'sistema-carburacion', TRUE),
    ('Sistema eléctrico general', 'sistema-electrico-general', TRUE),
    ('Sistema de escape', 'sistema-escape', TRUE),
    ('Sistema de transmisión', 'sistema-transmision', TRUE),
    ('Sistema de dirección', 'sistema-direccion', TRUE)
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name,
    is_active = TRUE;

COMMIT;
