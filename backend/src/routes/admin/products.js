import express from 'express';
const router = express.Router();
import * as controller from '../../controllers/admin/productsController.js';

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);

export default router;