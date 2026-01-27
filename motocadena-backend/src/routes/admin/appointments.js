const express = require('express');
const router = express.Router();
const AppointmentsController = require('../../controllers/admin/appointmentsController');

router.get('/', AppointmentsController.list);
router.post('/', AppointmentsController.create);
router.get('/:id', AppointmentsController.getById);
router.put('/:id', AppointmentsController.update);
router.post('/:id/confirm', AppointmentsController.confirm);
router.post('/:id/cancel', AppointmentsController.cancel);
router.get('/:id/work-order', AppointmentsController.getGeneratedWorkOrder);

module.exports = router;