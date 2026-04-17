import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { errorHandler } from './src/middleware/errorHandler.js';
import { supabase } from './src/services/supabaseClient.js';

// Routers (ESM)
import cashSessionsRouter from './src/routes/admin/cashSessions.js';
import posRouter from './src/routes/admin/pos.js';
import workOrdersRouter from './src/routes/admin/workOrders.js';
import appointmentsRouter from './src/routes/admin/appointments.js';
import productsRouter from './src/routes/admin/products.js';
import inventoryRouter from './src/routes/admin/inventory.js';
import servicesRouter from './src/routes/admin/services.js';
import customersRouter from './src/routes/admin/clients.js'; // We will refactor this to use 'customers' table
import expensesRouter from './src/routes/admin/expenses.js';
import portalRouter from './src/routes/public/portal.js';

const app = express();
const PORT = process.env.PORT || 3003;

// CORS
const allowedOrigins = [
  'https://motocadena.com',
  'https://www.motocadena.com',
  'http://localhost:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Role']
}));

app.use(express.json());
app.use(morgan('dev'));

// Health
app.get('/health', async (req, res) => {
  const { error } = await supabase.from('workshops').select('id').limit(1);
  res.json({
    ok: true,
    db: error ? `Error: ${error.message}` : 'Connected',
    timestamp: new Date().toISOString()
  });
});

// Admin Routes
const adminPrefix = '/api/admin';
app.use(`${adminPrefix}/cash-sessions`, cashSessionsRouter);
app.use(`${adminPrefix}/pos`, posRouter);
app.use(`${adminPrefix}/work-orders`, workOrdersRouter);
app.use(`${adminPrefix}/appointments`, appointmentsRouter);
app.use(`${adminPrefix}/products`, productsRouter);
app.use(`${adminPrefix}/inventory`, inventoryRouter);
app.use(`${adminPrefix}/services`, servicesRouter);
app.use(`${adminPrefix}/customers`, customersRouter);
app.use(`${adminPrefix}/expenses`, expensesRouter);

// Portal Routes
app.use('/api/portal', portalRouter);

// Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[motocadena-v2-backend] listening on port ${PORT}`);
});