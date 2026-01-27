const express = require('express');
const router = express.Router();
const ProductsController = require('../../controllers/admin/productsController');

router.get('/', ProductsController.list);
router.post('/', ProductsController.create);
router.get('/:id', ProductsController.getById);
router.put('/:id', ProductsController.update);
router.delete('/:id', ProductsController.remove);

module.exports = router;