import express from 'express';
const router = express.Router();
import * as controller from '../../controllers/admin/inventoryController.js';

router.get('/movements', controller.movements);
router.get('/stock', controller.stock);
router.post('/adjust', controller.adjust);

export default router;