import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Standardizing on hardcoded keys for production stability across all modules
const supabaseUrl = 'https://supabase.motocadena.com';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.yB_Jg-uxHi2JeYTEHDavqSVVvASIEFEpf6xiVwDxs38';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
    storage: window.localStorage
  },
});
