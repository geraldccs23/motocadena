import 'dotenv/config';

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, VITE_SUPABASE_ANON_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY');
  process.exit(1);
}

async function main() {
  const base = SUPABASE_URL.replace(/\/$/, '');
  const listUrl = `${base}/rest/v1/appointments?select=id,client_id,scheduled_at,status&order=created_at.desc&limit=3`;

  // GET con Accept-Profile: public
  const resList = await fetch(listUrl, {
    headers: {
      'accept-profile': 'public',
      apikey: VITE_SUPABASE_ANON_KEY || SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  console.log('GET /appointments status', resList.status);
  console.log('GET /appointments headers content-profile', resList.headers.get('content-profile'));
  const bodyList = await resList.text();
  console.log('GET /appointments body', bodyList);

  // POST: insertar una cita mínima
  const insertUrl = `${base}/rest/v1/appointments`;
  const payload = {
    client_id: process.env.TEST_CLIENT_ID || 'ad75fb8e-2cda-4c51-b39b-2f25ff98ab87',
    scheduled_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    notes: 'Cita creada via script test_rest_appointments',
    duration_minutes: 60,
  };
  const resPost = await fetch(insertUrl, {
    method: 'POST',
    headers: {
      'accept-profile': 'public',
      apikey: VITE_SUPABASE_ANON_KEY || SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });
  console.log('POST /appointments status', resPost.status);
  const postText = await resPost.text();
  console.log('POST /appointments body', postText);
}

main().catch((e) => { console.error('error', e); process.exit(1); });