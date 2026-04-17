import express from 'express';
import * as portalController from '../../controllers/public/portalController.js';

const router = express.Router();

// Ruta principal de inicio de sesión y sincronización del dashboard del cliente
router.post('/login', portalController.loginAndFetch);

export default router;
