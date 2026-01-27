import 'dotenv/config';

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY');
  process.exit(1);
}

async function main() {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/users?select=*`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  console.log('status', res.status);
  const text = await res.text();
  console.log('body', text);
}

main().catch((e) => { console.error('error', e); process.exit(1); });