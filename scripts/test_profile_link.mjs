import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;

const email = 'soporteacadai@gmail.com';
const password = 'Sird100609*';

if (!url || !anon) {
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, anon);

async function ensureUserProfile(authUserId, email) {
  const { data: byAuth, error: selAuthErr } = await supabase.from('users').select('*').eq('auth_user_id', authUserId).maybeSingle();
  console.log('select by auth_user_id error:', selAuthErr?.message || selAuthErr);
  console.log('select by auth_user_id data:', byAuth);
  if (byAuth) return byAuth;

  const { data: byEmail, error: selEmailErr } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
  console.log('select by email error:', selEmailErr?.message || selEmailErr);
  console.log('select by email data:', byEmail);
  if (byEmail) {
    const { data: upd, error: updErr } = await supabase.from('users').update({ auth_user_id: authUserId }).eq('id', byEmail.id).select('*').maybeSingle();
    console.log('update error:', updErr?.message || updErr);
    console.log('update data:', upd);
    return upd || byEmail;
  }

  const username = email;
  const full_name = email.split('@')[0];
  const { data: inserted, error: insErr } = await supabase
    .from('users')
    .insert({ full_name, username, role: 'mechanic', phone: null, email, status: 'active', auth_user_id: authUserId })
    .select('*')
    .maybeSingle();
  console.log('insert error:', insErr?.message || insErr);
  console.log('insert data:', inserted);
  return inserted;
}

async function main() {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  console.log('signIn error:', error?.message || error);
  const user = data?.user;
  if (!user) return;
  const profile = await ensureUserProfile(user.id, email);
  console.log('final profile:', profile);
}

main().catch((e) => { console.error('fatal', e); process.exit(1); });