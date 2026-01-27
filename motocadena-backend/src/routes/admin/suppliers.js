const express = require('express');
const router = express.Router();
const SuppliersController = require('../../controllers/admin/suppliersController');

router.get('/', SuppliersController.list);
router.post('/', SuppliersController.create);
router.get('/:id', SuppliersController.getById);
router.put('/:id', SuppliersController.update);
router.delete('/:id', SuppliersController.remove);

module.exports = router;