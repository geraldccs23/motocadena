const envBase =
  (import.meta as any)?.env?.VITE_ADMIN_BACKEND_URL ||
  (import.meta as any)?.env?.VITE_BACKEND_URL;

export const ADMIN_BASE = envBase || 'http://localhost:3003';
