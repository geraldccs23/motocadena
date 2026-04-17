import express from 'express';
const router = express.Router();
import * as controller from '../../controllers/admin/posController.js';

router.get('/list', controller.list);
router.post('/checkout', controller.checkout);
router.get('/:id', controller.getById);

export default router;