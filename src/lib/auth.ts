import { supabase } from './supabase';

export interface User {
  id: string;
  full_name: string;
  username: string;
  role: 'admin' | 'mechanic' | 'receptionist';
  phone: string | null;
  email: string | null;
  status: 'active' | 'inactive';
}

export async function loginUser(email: string, password: string): Promise<User | null> {
  // Supabase Auth email/password
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error('Login error:', signInError);
    return null;
  }

  const authUser = signInData.user;
  if (!authUser) return null;

  // Ensure user profile exists and fetch it
  const profile = await ensureUserProfile(authUser.id, authUser.email ?? email);
  if (!profile) return null;
  return profile;
}

async function ensureUserProfile(authUserId: string, email: string): Promise<User | null> {
  let authLinkSupported = true;
  // Try by auth_user_id first (si la columna existe)
  const { data: existingByAuth, error: authSelError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .limit(1)
    .maybeSingle();

  if (authSelError && String(authSelError?.message || authSelError).includes('column users.auth_user_id does not exist')) {
    authLinkSupported = false;
  }
  if (existingByAuth) return existingByAuth as User;

  // Fallback by email
  const { data: existingByEmail } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .limit(1)
    .maybeSingle();

  if (existingByEmail) {
    // Attach auth_user_id si la columna existe
    if (authLinkSupported) {
      await supabase
        .from('users')
        .update({ auth_user_id: authUserId })
        .eq('id', (existingByEmail as any).id);
    }
    return existingByEmail as User;
  }

  // Create minimal profile
  const username = email;
  const full_name = email.split('@')[0];
  const payload: any = { full_name, username, role: 'mechanic', phone: null, email, status: 'active' };
  if (authLinkSupported) payload.auth_user_id = authUserId;

  const { data: inserted, error } = await supabase
    .from('users')
    .insert(payload)
    .select('*')
    .maybeSingle();
  if (error) {
    console.error('Profile create error:', error?.message || error);
    return null;
  }
  return inserted as User;
}

export async function getCurrentUser(): Promise<User | null> {
  const userStr = localStorage.getItem('motocadena_user');
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function saveUser(user: User): void {
  localStorage.setItem('motocadena_user', JSON.stringify(user));
}

export function clearUser(): void {
  localStorage.removeItem('motocadena_user');
}

export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin';
}

export function isMechanic(user: User | null): boolean {
  return user?.role === 'mechanic';
}

export function isReceptionist(user: User | null): boolean {
  return user?.role === 'receptionist';
}
