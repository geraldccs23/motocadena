import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Faltan variables de entorno (SUPABASE_URL, SUPABASE_SERVICE_KEY)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const rawData = [
    { sku: 'L102-2-01', name: 'Banda Trasera Horse', type: 'Categoría 1', price: '7,00', stock: 2, status: 'En stock' },
    { sku: 'UT-BOM-STOP', name: 'Bombillo 2 Contacto Para Stop De Moto Universal', type: 'Categoría 1', price: '2,00', stock: 10, status: 'En stock' },
    { sku: 'UT-BOM-CRUCE', name: 'Bombillo Luces de Cruces', type: 'Categoría 1', price: '1,00', stock: 10, status: 'En stock' },
    { sku: 'L28-8-01', name: 'Arbol de Leva HJ150', type: 'Categoría 1', price: '17,00', stock: 1, status: 'En stock' },
    { sku: 'L28-8-01-COMPRA', name: 'Arbol de Leva HJ150 (Compra Gerald)', type: 'Categoría 1', price: '17,00', stock: 0, status: 'Agotado' },
    { sku: 'L28-3-01', name: 'Arbol de Leva GS125', type: 'Categoría 1', price: '20,00', stock: 2, status: 'En stock' },
    { sku: 'L28-2-01', name: 'Arbol de Leva OWEN 2014', type: 'Categoría 1', price: '17,00', stock: 1, status: 'En stock' },
    { sku: 'L36-1-03', name: 'Piston Horse 2013 SDT (Horse 150)', type: 'Categoría 1', price: '4,00', stock: 1, status: 'En stock' },
    { sku: 'L36-1-01', name: 'Piston Horse 2013 +0,25 (Horse 150)', type: 'Categoría 1', price: '4,00', stock: 1, status: 'En stock' },
    { sku: 'L36-1-02', name: 'Piston Horse 2013 +0,5 (Horse 150)', type: 'Categoría 1', price: '4,00', stock: 1, status: 'En stock' },
    { sku: 'L36-1-04', name: 'Piston Horse 2013 +0,75 (Horse 150)', type: 'Categoría 1', price: '4,00', stock: 1, status: 'En stock' },
    { sku: 'L36-4-02', name: 'Piston CG150 0,25', type: 'Categoría 1', price: '4,00', stock: 1, status: 'En stock' },
    { sku: 'L36-4-03', name: 'Piston CG150 0,50', type: 'Categoría 1', price: '4,00', stock: 1, status: 'En stock' },
    { sku: 'L36-3-02', name: 'Piston CG200 0,25', type: 'Categoría 1', price: '12,00', stock: 1, status: 'En stock' },
    { sku: 'L36-3-03', name: 'Piston CG200 0,50', type: 'Categoría 1', price: '13,00', stock: 1, status: 'En stock' },
    { sku: 'L36-2-01', name: 'Pinton Completo Bera150 SOCIALITAS', type: 'Categoría 1', price: '13,00', stock: 1, status: 'En stock' },
    { sku: 'UT-CG150-75', name: 'CG150 +75', type: 'Categoría 1', price: '4,00', stock: 1, status: 'En stock' },
    { sku: 'UT-CG150-25', name: 'CG150 BERA 150 +0,25', type: 'Categoría 1', price: '4,00', stock: 1, status: 'En stock' },
    { sku: 'UT-BOM-H4', name: 'Bombillo H4 Halogen', type: 'Categoría 1', price: '4,00', stock: 8, status: 'En stock' },
    { sku: 'UT-BOM-FARO', name: 'Bombillo Faro Delantero Universal', type: 'Categoría 1', price: '4,00', stock: 10, status: 'En stock' },
    { sku: 'L81A-1-01', name: 'Disco De Freno Trasero Scooter Bera Runner', type: 'Categoría 1', price: '12,00', stock: 1, status: 'En stock' },
    { sku: 'L103-3-01', name: 'Pastilla Delantera Jaguar', type: 'Categoría 1', price: '7,00', stock: 1, status: 'En stock' },
    { sku: 'L103-4-01', name: 'Pastilla Delantera Horse', type: 'Categoría 1', price: '7,00', stock: 0, status: 'Agotado' },
    { sku: 'L103-5-01', name: 'Pastilla Delantera GH', type: 'Categoría 1', price: '8,00', stock: 1, status: 'En stock' },
    { sku: 'UT-GN125-CLUTCH', name: 'Disco De Clutch GN 125', type: 'Categoría 1', price: '8,00', stock: 1, status: 'En stock' },
    { sku: 'L08-2-02', name: 'Disco De Clutch CG 125', type: 'Categoría 1', price: '7,00', stock: 1, status: 'En stock' },
    { sku: 'L37-03-02', name: 'Anillo 0.25 Owen GS', type: 'Categoría 1', price: '3,00', stock: 1, status: 'En stock' },
    { sku: 'L37-03-03', name: 'Anillo 0.50 Owen GS', type: 'Categoría 1', price: '3,00', stock: 1, status: 'En stock' },
    { sku: 'L37-05-02', name: 'Anillo CG200 +0.25', type: 'Categoría 1', price: '3,00', stock: 1, status: 'En stock' },
    { sku: 'L37-05-03', name: 'Anillo CG200 +0.50', type: 'Categoría 1', price: '3,00', stock: 1, status: 'En stock' },
    { sku: 'L37-10-02', name: 'Anillo Bera Socialosta 0.25', type: 'Categoría 1', price: '3,00', stock: 1, status: 'En stock' },
    { sku: 'L37-10-03', name: 'Anillo Bera Socialosta 0.50', type: 'Categoría 1', price: '3,00', stock: 1, status: 'En stock' },
    { sku: 'UT-AN-HORSE-25', name: 'Anillo Horse +0.25', type: 'Categoría 1', price: '3,00', stock: 1, status: 'En stock' },
    { sku: 'UT-AN-HORSE-50', name: 'Anillo Horse +0.50', type: 'Categoría 1', price: '3,00', stock: 1, status: 'En stock' },
    { sku: 'UT-AN-CG150-25', name: 'Anillo CG150 +0.25', type: 'Categoría 1', price: '3,00', stock: 1, status: 'En stock' },
    { sku: 'UT-AN-CG150-50', name: 'Anillo CG150 +0.50', type: 'Categoría 1', price: '3,00', stock: 1, status: 'En stock' },
    { sku: 'UT-AN-CG150-75', name: 'Anillo CG150 +0.75', type: 'Categoría 1', price: '5,00', stock: 1, status: 'En stock' },
    { sku: 'UT-DT-EMP-200', name: 'Empacadura DT 200', type: 'Categoría 1', price: '3,00', stock: 0, status: 'Agotado' },
    { sku: 'L48A-3-01', name: 'Kit Medio Empacadura Gn', type: 'Categoría 1', price: '5,00', stock: 1, status: 'En stock' }
];

async function seed() {
    console.log('--- RE-INICIALIZACIÓN DE STOCK MOTOCADENA ---');

    // 1. Limpiar movimientos previos de inicialización para evitar duplicados
    await supabase.from('inventory_movements').delete().match({ source: 'init' });

    for (const item of rawData) {
        const price = parseFloat(item.price.replace(',', '.'));
        const productData = {
            sku: item.sku,
            name: item.name,
            unit_price: price,
            unit_cost: price * 0.7,
            status: item.status === 'Agotado' ? 'inactive' : 'active',
            description: item.type
        };

        const { data: product, error: pErr } = await supabase
            .from('products')
            .upsert(productData, { onConflict: 'sku' })
            .select()
            .single();

        if (pErr) {
            console.error(`Error en producto ${item.name}:`, pErr.message);
            continue;
        }

        if (item.stock > 0) {
            const { error: invErr } = await supabase
                .from('inventory_movements')
                .insert({
                    product_id: product.id,
                    movement_type: 'in',
                    quantity: item.stock,
                    unit_cost: product.unit_cost,
                    source: 'init'
                });

            if (invErr) {
                console.error(`Error ajustando stock para ${item.name}:`, invErr.message);
            } else {
                console.log(`✓ ${item.name}: [Stock: ${item.stock}] [Precio: $${price}]`);
            }
        } else {
            console.log(`⚠ ${item.name}: [Agotado]`);
        }
    }
    console.log('--- PROCESO COMPLETADO ---');
}

seed();
