const envBase =
  import.meta.env.VITE_ADMIN_BACKEND_URL ||
  import.meta.env.VITE_BACKEND_URL;

export const ADMIN_BASE = envBase || 'https://api.motocadena.com';
