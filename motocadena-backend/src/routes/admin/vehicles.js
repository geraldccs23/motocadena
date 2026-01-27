const express = require('express');
const router = express.Router();
const VehiclesController = require('../../controllers/admin/vehiclesController');

router.get('/', VehiclesController.list);
router.post('/', VehiclesController.create);
router.put('/:id', VehiclesController.update);
router.delete('/:id', VehiclesController.remove);

module.exports = router;