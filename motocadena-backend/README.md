# Motocadena Backend

API backend para Motocadena usando Express y Supabase.

## Requisitos
- Node.js 18+
- Supabase (URL y Service Role Key)

## Instalación

```bash
cd motocadena-backend
npm install
cp .env.example .env
# Edita .env con tus credenciales de Supabase
```

## Ejecutar en desarrollo

```bash
npm start
# El servidor escucha en `http://localhost:3003/`
# Health: GET /health
```

## Endpoints principales

- `GET /public/orders/by-plate/:plate` — Consulta estado por placa
- `GET /admin/work-orders` — Lista órdenes
- `POST /admin/work-orders` — Crea orden
- `GET /admin/work-orders/:id` — Detalle de orden
- `POST /admin/work-orders/:id/services` — Añade servicio
- `POST /admin/inspections/:id/initial` — Upsert inspección inicial
- `POST /admin/inspections/:id/final` — Upsert inspección final
- `GET /admin/reports/summary` — Resumen (conteos)

## PM2 (opcional)

Instala PM2 globalmente:

```bash
npm install -g pm2
```

Ejecuta el backend con PM2:

```bash
pm2 start server.js --name motocadena-backend --env production
pm2 status
pm2 logs motocadena-backend
```

Detener y reiniciar:

```bash
pm2 stop motocadena-backend
pm2 restart motocadena-backend
```

## Variables de entorno

- `SUPABASE_URL` — URL de tu proyecto Supabase
- `SUPABASE_SERVICE_KEY` — Service Role Key de Supabase (usa con cuidado)
- `PORT` — Puerto del servidor (por defecto 3003)
- `CORS_ORIGIN` — Origen permitido para CORS (opcional)

## Notas

- Este backend usa el cliente de servicio de Supabase para bypass de RLS. Valida bien las entradas.
- Las políticas de RLS en las tablas están configuradas para autenticados; el backend actúa como trusted client.