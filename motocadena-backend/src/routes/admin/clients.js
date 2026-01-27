const express = require('express');
const router = express.Router();
const ClientsController = require('../../controllers/admin/clientsController');

// CRUD clientes
router.get('/', ClientsController.list);
router.post('/', ClientsController.create);
router.get('/:id', ClientsController.getById);
router.put('/:id', ClientsController.update);
router.delete('/:id', ClientsController.remove);

// Vehículos por cliente (ruta requerida)
router.get('/:id/vehicles', ClientsController.listVehiclesByClient);

module.exports = router;