const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const cats = [
    { name: 'Lubricantes', slug: 'lubricantes', description: 'Aceites y líquidos de alto desempeño' },
    { name: 'Repuestos', slug: 'repuestos', description: 'Piezas originales y compatibles' },
    { name: 'Accesorios', slug: 'accesorios', description: 'Equipamiento y mejoras para tu moto' }
];

async function run() {
    console.log('Creando categorías...');
    const { data, error } = await supabase
        .from('product_categories')
        .upsert(cats, { onConflict: 'slug' })
        .select();

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Categorías creadas:', data.length);
    }
}

run();
