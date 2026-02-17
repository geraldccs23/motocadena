const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log("--- Checking products ---");
    const { data: p, error: pe } = await supabase.from('products').select('*').limit(1);
    if (pe) console.error("Products error:", pe);
    else console.log("Products sample:", p);

    console.log("\n--- Checking work_order_parts ---");
    const { data: wop, error: wope } = await supabase.from('work_order_parts').select('*').limit(1);
    if (wope) console.error("Work Order Parts error:", wope);
    else console.log("Work Order Parts sample:", wop);
}

check();
