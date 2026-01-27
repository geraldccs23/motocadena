import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Parámetros por CLI: --email, --password, --full_name, --username, --role
function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.replace(/^--/, '');
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      out[key] = val;
      if (val !== true) i++;
    }
  }
  return out;
}

const argv = parseArgs();
const email = typeof argv.email === 'string' ? argv.email : 'admin@motocadena.com';
const password = typeof argv.password === 'string' ? argv.password : 'Motocadena2025!';
const full_name = typeof argv.full_name === 'string' ? argv.full_name : (email.includes('@') ? email.split('@')[0] : 'Administrador');
const username = typeof argv.username === 'string' ? argv.username : (email.includes('@') ? email.split('@')[0] : 'admin');
const role = typeof argv.role === 'string' ? argv.role : 'admin';

async function ensureAuthUser() {
  // Primero intento crear el usuario
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    // Si ya existe, lo busco
    console.warn('createUser error, intento localizar usuario existente:', error.message || error);
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) throw listErr;
    const found = list?.users?.find((u) => u.email === email);
    if (!found) throw new Error('No se pudo crear ni encontrar el usuario de Auth');
    return found;
  }
  return data.user;
}

async function upsertProfile(user) {
  const auth_user_id = user.id;
  // Busco por email; si existe, actualizo; si no, inserto (service key ignora RLS)
  const { data: existing, error: selErr } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (selErr) throw selErr;

  if (existing) {
    const { data: upd, error: updErr } = await supabase
      .from('users')
      .update({ full_name, username, role, phone: null, status: 'active', auth_user_id })
      .eq('id', existing.id)
      .select('*')
      .maybeSingle();
    if (updErr) throw updErr;
    return upd;
  } else {
    const { data: ins, error: insErr } = await supabase
      .from('users')
      .insert({ full_name, username, role, phone: null, email, status: 'active', auth_user_id })
      .select('*')
      .maybeSingle();
    if (insErr) throw insErr;
    return ins;
  }
}

try {
  const authUser = await ensureAuthUser();
  console.log('Auth user localizado:', authUser?.id);
  const profile = await upsertProfile(authUser);
  console.log('Usuario creado/actualizado correctamente');
  console.log({ email, password, auth_user_id: authUser.id, profile_id: profile?.id, role: profile?.role });
  process.exit(0);
} catch (e) {
  console.error('Error creando usuario:', e?.message || e);
  try { console.error('Detalles:', JSON.stringify(e, null, 2)); } catch {}
  process.exit(1);
}