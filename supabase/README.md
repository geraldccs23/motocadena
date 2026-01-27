Supabase migrations y backend

Estructura:
- `supabase/migrations/` contiene los archivos SQL de migración para crear el esquema, políticas RLS, funciones y datos de ejemplo.

Cómo aplicar en Supabase Cloud:
- Opción 1 (rápida): copia el contenido de cada archivo SQL y ejecútalo en el SQL Editor de tu proyecto Supabase en orden (0001 → 0002 → 0003 → 0004 → 0005 → 0006).
- Opción 2 (CLI): si usas Supabase CLI, coloca estos archivos en `supabase/migrations` y usa `supabase db push` contra tu proyecto remoto.

Notas importantes:
- Las políticas RLS por defecto permiten a `anon` realizar operaciones de lectura y escritura para mantener la funcionalidad del frontend actual. Endurece estas políticas en producción.
- La función `login_user` verifica credenciales contra la tabla `users` usando `pgcrypto`.
- Los triggers mantienen `updated_at` actualizado.
- La migración `0006` hace opcional `password_hash` en `users` para usar exclusivamente Supabase Auth.