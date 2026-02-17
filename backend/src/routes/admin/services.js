const express = require('express');
const router = express.Router();
const ServicesController = require('../../controllers/admin/servicesController');

router.get('/', ServicesController.list);
router.get('/:id', ServicesController.getById);
router.post('/', ServicesController.create);
router.put('/:id', ServicesController.update);
router.delete('/:id', ServicesController.remove);

module.exports = router;