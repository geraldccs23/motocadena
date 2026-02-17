
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const workshop_id = '6319bebb-72e6-4f12-b104-3a1216c8731d'; // Detectado via CLI

const basicServices = [
    "Revisión del flotante de gasolina",
    "Ajuste de rodamientos / holguras",
    "Ajuste general de la moto (tornillería crítica)",
    "Mantenimiento del filtro del purificador / caja filtro",
    "Revisión y ajuste de luces: altas, bajas, direccionales y stop",
    "Cambio de aceite + limpieza de filtro",
    "Calibración y limpieza de bujía",
    "Ajuste de clutch y freno (cable/tensión)",
    "Ajuste de cadena y alineación básica de rueda",
    "Revisión de presión de neumáticos y desgaste",
    "Revisión de batería y terminales",
    "Engrase rápido de cables, palancas y pedales",
].map(name => ({
    name,
    description: "Servicio de mantenimiento preventivo esencial.",
    price: 10,
    estimated_duration_min: 30,
    is_active: true,
    workshop_id
}));

const pricingList = [
    ["Motor 3/4", 25],
    ["Reparación de motor (completo)", 50],
    ["Reparación o cambio de caja", 50],
    ["Calibración de válvulas", 15],
    ["Limpieza de carburador", 10],
    ["Cambio de cadena, piñón y corona", 20],
    ["Mantenimiento de barras", 20],
    ["Cambio o mantenimiento de pista del manubrio", 20],
    ["Reparaciones del croche (clutch)", 20],
    ["Diagnóstico eléctrico", 30],
    ["Cambio de buje de horquilla", 20],
    ["Mantenimiento / reparación de frenos", 15],
    ["Cambio de árbol de levas", 20],
    ["Revisión para detectar fallas", 10],
].map(([name, price]) => ({
    name,
    description: "Mano de obra especializada.",
    price,
    estimated_duration_min: 60,
    is_active: true,
    workshop_id
}));

async function seed() {
    console.log("🚀 Iniciando carga de servicios a MOTOCADENA...");

    const allServices = [...basicServices, ...pricingList];

    const { data, error } = await supabase
        .from('services')
        .insert(allServices);

    if (error) {
        console.error("❌ Error al cargar servicios:", error);
    } else {
        console.log("✅ Servicios cargados exitosamente.");
    }
}

seed();
