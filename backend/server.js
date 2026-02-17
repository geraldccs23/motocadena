require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { errorHandler } = require('./src/middleware/errorHandler');
const { authPlaceholder } = require('./src/middleware/authPlaceholder');

// Routers
const adminClientsRouter = require('./src/routes/admin/clients');
const adminVehiclesRouter = require('./src/routes/admin/vehicles');
const adminMechanicsRouter = require('./src/routes/admin/mechanics');
const adminServicesRouter = require('./src/routes/admin/services');
const adminWorkOrdersRouter = require('./src/routes/admin/workOrders');
const adminInspectionsRouter = require('./src/routes/admin/inspections');
const adminAppointmentsRouter = require('./src/routes/admin/appointments');
const adminProductsRouter = require('./src/routes/admin/products');
const adminSuppliersRouter = require('./src/routes/admin/suppliers');
const adminPurchasesRouter = require('./src/routes/admin/purchases');
const adminInventoryRouter = require('./src/routes/admin/inventory');
const adminPosRouter = require('./src/routes/admin/pos');
const adminReportsRouter = require('./src/routes/admin/reports');

const publicOrdersRouter = require('./src/routes/public/orders');
const publicServicesRouter = require('./src/routes/public/services');
const publicAppointmentsRouter = require('./src/routes/public/appointments');

const app = express();
const PORT = process.env.PORT || 3003;

// Configuración de CORS más robusta
const allowedOrigins = [
  'https://motocadena.com',
  'https://www.motocadena.com',
  'http://localhost:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (como apps móviles o curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.warn(`[CORS] Intento de acceso bloqueado desde origen no permitido: ${origin}`);
      callback(null, false); // Denegar silenciosamente en lugar de lanzar Error
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Role'],
  optionsSuccessStatus: 200 // Estado de éxito para el preflight (OPTIONS)
}));

app.use(express.json());
app.use(morgan('dev'));

// Health & Diagnostics
const { supabase } = require('./src/services/supabaseClient');
app.get('/health', async (req, res) => {
  try {
    const start = Date.now();
    const { data, error } = await supabase.from('products').select('id').limit(1);
    const dbStatus = error ? `Error: ${error.message}` : 'Connected';
    res.json({
      ok: true,
      service: 'motocadena-backend',
      db: dbStatus,
      latency: `${Date.now() - start}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Exchange Rate (Placeholder/Static for now)
app.get('/admin/rate', (req, res) => {
  res.json({ ok: true, exchange_rate: 60.0 }); // Default rate for testing
});

// Auth placeholder (no bloquea nada por ahora)
app.use(authPlaceholder);

// Admin Users Router (New)
const adminUsersRouter = require('./src/routes/admin/users');

// Soporte para ambos prefijos /admin y /api/admin
const adminPrefixes = ['/admin', '/api/admin'];

adminPrefixes.forEach(prefix => {
  app.use(prefix, adminUsersRouter);
  app.use(`${prefix}/clients`, adminClientsRouter);
  app.use(`${prefix}/vehicles`, adminVehiclesRouter);
  app.use(`${prefix}/mechanics`, adminMechanicsRouter);
  app.use(`${prefix}/services`, adminServicesRouter);
  app.use(`${prefix}/work-orders`, adminWorkOrdersRouter);
  app.use(`${prefix}/inspections`, adminInspectionsRouter);
  app.use(`${prefix}/appointments`, adminAppointmentsRouter);
  app.use(`${prefix}/products`, adminProductsRouter);
  app.use(`${prefix}/suppliers`, adminSuppliersRouter);
  app.use(`${prefix}/purchases`, adminPurchasesRouter);
  app.use(`${prefix}/inventory`, adminInventoryRouter);
  app.use(`${prefix}/pos`, adminPosRouter);
  app.use(`${prefix}/reports`, adminReportsRouter);
});

// Public routes
app.use('/public/orders', publicOrdersRouter);
app.use('/public/services', publicServicesRouter);
app.use('/public/appointments', publicAppointmentsRouter);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[motocadena-backend] listening on port ${PORT}`);
});