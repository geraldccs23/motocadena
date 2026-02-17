const express = require('express');
const router = express.Router();
const PurchasesController = require('../../controllers/admin/purchasesController');

router.get('/', PurchasesController.list);
router.post('/', PurchasesController.create);
router.get('/:id', PurchasesController.getById);
router.post('/:id/items', PurchasesController.addItem);
router.put('/:id/items/:itemId', PurchasesController.updateItem);
router.delete('/:id/items/:itemId', PurchasesController.removeItem);
router.post('/:id/receive', PurchasesController.receive);
router.post('/:id/cancel', PurchasesController.cancel);

module.exports = router;