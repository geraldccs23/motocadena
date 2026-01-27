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

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'motocadena-backend', timestamp: new Date().toISOString() });
});

// Exchange Rate (Placeholder/Static for now)
app.get('/admin/rate', (req, res) => {
  res.json({ ok: true, exchange_rate: 60.0 }); // Default rate for testing
});

// Auth placeholder (no bloquea nada por ahora)
app.use(authPlaceholder);

// Admin routes
app.use('/admin/clients', adminClientsRouter);
app.use('/admin/vehicles', adminVehiclesRouter);
app.use('/admin/mechanics', adminMechanicsRouter);
app.use('/admin/services', adminServicesRouter);
app.use('/admin/work-orders', adminWorkOrdersRouter);
app.use('/admin/inspections', adminInspectionsRouter);
app.use('/admin/appointments', adminAppointmentsRouter);
app.use('/admin/products', adminProductsRouter);
app.use('/admin/suppliers', adminSuppliersRouter);
app.use('/admin/purchases', adminPurchasesRouter);
app.use('/admin/inventory', adminInventoryRouter);
app.use('/admin/pos', adminPosRouter);
app.use('/admin/reports', adminReportsRouter);

// Public routes
app.use('/public/orders', publicOrdersRouter);
app.use('/public/services', publicServicesRouter);
app.use('/public/appointments', publicAppointmentsRouter);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[motocadena-backend] listening on port ${PORT}`);
});