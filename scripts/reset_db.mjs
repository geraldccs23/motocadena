import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_KEY en .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const confirm = (process.env.RESET_CONFIRM || '').toLowerCase();
const yesFlag = process.argv.includes('--yes') || confirm === 'yes' || confirm === 'true';
if (!yesFlag) {
  console.error('Operación abortada: agrega --yes o establece RESET_CONFIRM=yes para continuar');
  process.exit(1);
}

const tables = [
  // Hijas primero
  'pos_sale_payments',
  'pos_sale_items',
  'purchase_items',
  'inventory_movements',
  'work_order_services',
  'initial_inspections',
  'final_inspections',
  // Padres después
  'work_orders',
  'pos_sales',
  'purchase_invoices',
  'appointments',
  'web_appointments',
  'vehicles',
  'clients',
  'products',
  'suppliers',
  'services',
];

async function wipe(table) {
  try {
    const sel = await supabase.from(table).select('id', { count: 'exact', head: true });
    const count = sel?.count || 0;
    if (count === 0) {
      console.log(`[${table}] ya está vacío`);
      return;
    }
    const del = await supabase.from(table).delete().not('id', 'is', null);
    if (del.error) throw del.error;
    console.log(`[${table}] eliminado: ${count} filas`);
  } catch (e) {
    console.error(`[${table}] error al eliminar:`, e?.message || e);
  }
}

async function main() {
  for (const t of tables) {
    await wipe(t);
  }
  console.log('Reset de tablas completado');
}

main().catch((e) => { console.error('fatal', e); process.exit(1); });

