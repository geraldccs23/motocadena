const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey || !anonKey) {
    console.log('Missing env vars:', { supabaseUrl: !!supabaseUrl, serviceKey: !!serviceKey, anonKey: !!anonKey });
    process.exit(1);
}

const serviceClient = createClient(supabaseUrl, serviceKey);
const anonClient = createClient(supabaseUrl, anonKey);

async function check() {
    console.log('--- DB Check ---');

    const { data: sData, error: sErr } = await serviceClient.from('services').select('*').limit(3);
    if (sErr) console.error('Service Key Err:', sErr.message);
    else console.log('Service Key Access: OK. Found:', sData.length, 'total samples.');

    const { data: aData, error: aErr } = await anonClient.from('services').select('*').limit(3);
    if (aErr) console.error('Anon Key Err:', aErr.message);
    else {
        console.log('Anon Key Access: OK. Found:', aData.length, 'rows.');
        if (aData.length === 0) {
            console.log('WARNING: Anon Key sees 0 rows. RLS is likely blocking public access.');
        }
    }
}

check();
