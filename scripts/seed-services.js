import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Si no está cargado al inicio, intentar cargar desde el root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Faltan variables de entorno (SUPABASE_URL, SUPABASE_SERVICE_KEY)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const services = [
    { name: 'Motor 3/4', description: 'Desarmado y armado parcial del motor (cilindro, pistón y culata) para rectificación o cambio de anillos.', base_price: 25, duration_minutes: 180 },
    { name: 'Reparación de motor (completo)', description: 'Mantenimiento integral del motor, incluyendo apertura de cárter, revisión de biela, cigüeñal y rodamientos internos.', base_price: 50, duration_minutes: 360 },
    { name: 'Reparación o cambio de caja', description: 'Apertura del bloque de motor para ajuste, reparación o sustitución de piñones y ejes de la caja de cambios.', base_price: 50, duration_minutes: 300 },
    { name: 'Calibración de válvulas', description: 'Ajuste preciso de la holgura de válvulas para optimizar el rendimiento del motor y reducir ruidos.', base_price: 15, duration_minutes: 60 },
    { name: 'Limpieza de carburador', description: 'Desmontaje completo, limpieza profunda de conductos y surtidores, y ajuste de mezcla aire-combustible.', base_price: 10, duration_minutes: 45 },
    { name: 'Cambio de cadena, piñón y corona', description: 'Sustitución del kit de arrastre completo, limpieza de áreas internas y alineación profesional de la rueda trasera.', base_price: 20, duration_minutes: 90 },
    { name: 'Mantenimiento de barras', description: 'Cambio de retenes de aceite, limpieza interna de botellas y sustitución de fluido hidráulico de suspensión delantera.', base_price: 20, duration_minutes: 120 },
    { name: 'Cambio o mantenimiento de pista del manubrio', description: 'Sustitución de baleros, cunas y ajuste de la columna de dirección para un manejo suave y sin juego.', base_price: 20, duration_minutes: 120 },
    { name: 'Reparaciones del croche (clutch)', description: 'Revisión y sustitución de discos de fricción, separadores y resortes de embrague según desgaste.', base_price: 20, duration_minutes: 90 },
    { name: 'Diagnóstico eléctrico', description: 'Revisión técnica del sistema de carga, bobinas, ramal eléctrico principal y componentes de encendido.', base_price: 15, duration_minutes: 60 },
    { name: 'Cambio de buje de horquilla', description: 'Desmontaje de la tijera trasera y sustitución de bujes para eliminar vibraciones y juegos laterales.', base_price: 20, duration_minutes: 120 },
    { name: 'Mantenimiento / reparación de frenos', description: 'Limpieza de mordazas, rectificación de bandas, cambio de pastillas y purgado de sistema hidráulico (si aplica).', base_price: 10, duration_minutes: 60 },
    { name: 'Cambio de árbol de levas', description: 'Sustitución del árbol de levas y revisión de componentes asociados a la sincronización del motor.', base_price: 20, duration_minutes: 150 },
    { name: 'Revisión para detectar fallas', description: 'Inspección técnica general y pruebas de funcionamiento para identificar el origen de fallas reportadas.', base_price: 10, duration_minutes: 30 }
];

async function seed() {
    console.log('Sembrando servicios en Supabase...');

    for (const service of services) {
        const { data, error } = await supabase
            .from('services')
            .upsert(service, { onConflict: 'name' });

        if (error) {
            console.error(`Error sembrando ${service.name}:`, error.message);
        } else {
            console.log(`✓ Servicio sembrado: ${service.name}`);
        }
    }
}

seed();
