-- Sembrar servicios base solicitados por el usuario
-- Estos servicios aparecerán en el área de staff y en la web pública

INSERT INTO public.services (name, description, base_price, duration_minutes)
VALUES 
('Motor 3/4', 'Desarmado y armado parcial del motor (cilindro, pistón y culata) para rectificación o cambio de anillos.', 25, 180),
('Reparación de motor (completo)', 'Mantenimiento integral del motor, incluyendo apertura de cárter, revisión de biela, cigüeñal y rodamientos internos.', 50, 360),
('Reparación o cambio de caja', 'Apertura del bloque de motor para ajuste, reparación o sustitución de piñones y ejes de la caja de cambios.', 50, 300),
('Calibración de válvulas', 'Ajuste preciso de la holgura de válvulas para optimizar el rendimiento del motor y reducir ruidos.', 15, 60),
('Limpieza de carburador', 'Desmontaje completo, limpieza profunda de conductos y surtidores, y ajuste de mezcla aire-combustible.', 10, 45),
('Cambio de cadena, piñón y corona', 'Sustitución del kit de arrastre completo, limpieza de áreas internas y alineación profesional de la rueda trasera.', 20, 90),
('Mantenimiento de barras', 'Cambio de retenes de aceite, limpieza interna de botellas y sustitución de fluido hidráulico de suspensión delantera.', 20, 120),
('Cambio o mantenimiento de pista del manubrio', 'Sustitución de baleros, cunas y ajuste de la columna de dirección para un manejo suave y sin juego.', 20, 120),
('Reparaciones del croche (clutch)', 'Revisión y sustitución de discos de fricción, separadores y resortes de embrague según desgaste.', 20, 90),
('Diagnóstico eléctrico', 'Revisión técnica del sistema de carga, bobinas, ramal eléctrico principal y componentes de encendido.', 15, 60),
('Cambio de buje de horquilla', 'Desmontaje de la tijera trasera y sustitución de bujes para eliminar vibraciones y juegos laterales.', 20, 120),
('Mantenimiento / reparación de frenos', 'Limpieza de mordazas, rectificación de bandas, cambio de pastillas y purgado de sistema hidráulico (si aplica).', 10, 60),
('Cambio de árbol de levas', 'Sustitución del árbol de levas y revisión de componentes asociados a la sincronización del motor.', 20, 150),
('Revisión para detectar fallas', 'Inspección técnica general y pruebas de funcionamiento para identificar el origen de fallas reportadas.', 10, 30)
ON CONFLICT (name) DO NOTHING;
