-- Migration 0046_seed_categories.sql
-- Seeding initial product categories for the eCommerce module

INSERT INTO public.product_categories (name, slug, description, image_url, is_active)
VALUES 
    ('Suspension delantera', 'suspension-delantera', 'Repuestos y componentes para la suspensión delantera de tu moto.', NULL, TRUE),
    ('Suspension Trasera', 'suspension-trasera', 'Amortiguadores y sistema de suspensión trasera.', NULL, TRUE),
    ('Empacaduras', 'empacaduras', 'Kits de empacaduras y sellos para motor y chasis.', NULL, TRUE),
    ('Kit de Arrastre', 'kit-de-arrastre', 'Piñones, coronas y cadenas de alta resistencia.', NULL, TRUE),
    ('Partes Externas de motor', 'partes-externas-motor', 'Componentes visibles y periféricos del motor.', NULL, TRUE),
    ('Partes Internas de motor', 'partes-internas-motor', 'Componentes mecánicos internos del bloque motor.', NULL, TRUE),
    ('Sistema de Encendido', 'sistema-encendido', 'Bujías, bobinas y CDI para un encendido óptimo.', NULL, TRUE),
    ('Sistema de Arranque', 'sistema-arranque', 'Motores de arranque, bendix y relés.', NULL, TRUE),
    ('Sistema de Frenos', 'sistema-frenos', 'Pastillas, discos y bombas de freno.', NULL, TRUE),
    ('Sistema de Inyeccion', 'sistema-inyeccion', 'Sensores, inyectores y cuerpos de aceleración.', NULL, TRUE),
    ('Sistema de Carburacion', 'sistema-carburacion', 'Carburadores, agujas y kits de reparación.', NULL, TRUE)
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name,
    description = EXCLUDED.description;
