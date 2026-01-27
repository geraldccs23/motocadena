-- Usuario admin inicial (password: admin123)
insert into public.users (full_name, username, password_hash, role, phone, email, status)
values (
  'Administrador',
  'admin',
  crypt('admin123', gen_salt('bf')),
  'admin',
  '000000000',
  'admin@motocadena.com',
  'active'
)
on conflict (username) do nothing;

-- Servicios de ejemplo
insert into public.services (name, description, base_price, duration_minutes)
values
  ('Cambio de aceite', 'Servicio básico de mantenimiento', 30.00, 45),
  ('Ajuste de frenos', 'Revisión y ajuste de sistema de frenos', 25.00, 30)
on conflict (name) do nothing;