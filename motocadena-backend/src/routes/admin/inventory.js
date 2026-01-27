const express = require('express');
const router = express.Router();
const InventoryController = require('../../controllers/admin/inventoryController');

router.get('/movements', InventoryController.movements);
router.get('/stock', InventoryController.stock);
router.get('/stock/:productId', InventoryController.stockByProduct);
router.post('/adjust', InventoryController.adjust);

module.exports = router;