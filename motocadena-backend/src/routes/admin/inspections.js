const express = require('express');
const router = express.Router();

const WorkOrdersController = require('../../controllers/admin/workOrdersController');

// Inspección inicial
router.get('/:id/initial', WorkOrdersController.getInitialInspection);
router.post('/:id/initial', WorkOrdersController.upsertInitialInspection);

// Inspección final
router.get('/:id/final', WorkOrdersController.getFinalInspection);
router.post('/:id/final', WorkOrdersController.upsertFinalInspection);

module.exports = router;