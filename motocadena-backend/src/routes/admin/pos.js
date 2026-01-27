const express = require('express');
const router = express.Router();
const PosController = require('../../controllers/admin/posController');

router.get('/sales', PosController.listSales);
router.post('/sales', PosController.createSale);
router.get('/sales/:id', PosController.getSaleById);
router.post('/sales/:id/items', PosController.addSaleItem);
router.put('/sales/:id/items/:itemId', PosController.updateSaleItem);
router.delete('/sales/:id/items/:itemId', PosController.removeSaleItem);
router.post('/sales/:id/payments', PosController.addPayment);
router.post('/sales/:id/pay', PosController.markPaid);
router.post('/sales/:id/void', PosController.markVoid);
router.get('/rate', (req, res) => res.json({ ok: true, exchange_rate: 60.0 }));

// Returns
router.post('/returns', PosController.createReturn);
router.get('/returns/:id', PosController.getReturnById);
router.post('/returns/:id/items', PosController.addReturnItem);

module.exports = router;