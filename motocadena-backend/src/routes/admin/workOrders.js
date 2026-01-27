const express = require('express');
const router = express.Router();
const WorkOrdersController = require('../../controllers/admin/workOrdersController');

// Órdenes
router.get('/', WorkOrdersController.list);
router.post('/', WorkOrdersController.create);
router.get('/:id', WorkOrdersController.getById);
router.put('/:id', WorkOrdersController.update);
router.post('/:id/status', WorkOrdersController.updateStatus);

// Detalles de orden (servicios)
router.post('/:id/services', WorkOrdersController.addServiceItem);
router.put('/:id/services/:itemId', WorkOrdersController.updateServiceItem);
router.delete('/:id/services/:itemId', WorkOrdersController.removeServiceItem);

// Inspección inicial
router.post('/:id/inspection-initial', WorkOrdersController.upsertInitialInspection);
router.get('/:id/inspection-initial', WorkOrdersController.getInitialInspection);

// Inspección final
router.post('/:id/inspection-final', WorkOrdersController.upsertFinalInspection);
router.get('/:id/inspection-final', WorkOrdersController.getFinalInspection);

module.exports = router;