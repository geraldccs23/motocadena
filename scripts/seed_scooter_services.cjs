
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const workshop_id = '6319bebb-72e6-4f12-b104-3a1216c8731d';

const scooterServices = [
    { name: "Mantenimiento de carburador, filtro de aire y bujía (Scooter)", price: 25, description: "SCOOTER_SERVICE", workshop_id, estimated_duration_min: 60, is_active: true },
    { name: "Mantenimiento del sistema de frenos (Scooter)", price: 15, description: "SCOOTER_SERVICE", workshop_id, estimated_duration_min: 45, is_active: true },
    { name: "Mantenimiento de caja de transmisión (CVT) (Scooter)", price: 15, description: "SCOOTER_SERVICE", workshop_id, estimated_duration_min: 45, is_active: true },
    { name: "Reparación de caja de transmisión (CVT) (Scooter)", price: 40, description: "SCOOTER_SERVICE", workshop_id, estimated_duration_min: 120, is_active: true },
    { name: "Cambio de aceite (Scooter)", price: 10, description: "SCOOTER_SERVICE", workshop_id, estimated_duration_min: 15, is_active: true },
    { name: "Graduación de válvulas (Scooter)", price: 10, description: "SCOOTER_SERVICE", workshop_id, estimated_duration_min: 30, is_active: true },
    { name: "Mantenimiento de tren delantero (Scooter)", price: 40, description: "SCOOTER_SERVICE", workshop_id, estimated_duration_min: 90, is_active: true },
    { name: "Servicio “3 × 4” (Scooter)", price: 55, description: "SCOOTER_SERVICE_COMBINED", workshop_id, estimated_duration_min: 150, is_active: true },
    { name: "Servicio Scooter Completa (Hasta 150 cc)", price: 185, description: "SCOOTER_SERVICE_FULL", workshop_id, estimated_duration_min: 300, is_active: true },
    { name: "Servicio Scooter Completa (200 a 250 cc)", price: 215, description: "SCOOTER_SERVICE_FULL", workshop_id, estimated_duration_min: 300, is_active: true },
    { name: "Servicio Scooter Completa (300 cc o más)", price: 245, description: "SCOOTER_SERVICE_FULL", workshop_id, estimated_duration_min: 300, is_active: true },
];

async function seed() {
    console.log("🚀 Iniciando carga de servicios SCOOTER a MOTOCADENA...");

    const { data, error } = await supabase
        .from('services')
        .insert(scooterServices);

    if (error) {
        console.error("❌ Error al cargar servicios SCOOTER:", error);
    } else {
        console.log("✅ Servicios SCOOTER cargados exitosamente.");
    }
}

seed();
