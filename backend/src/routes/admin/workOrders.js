import express from 'express';
const router = express.Router();
import * as controller from '../../controllers/admin/workOrdersController.js';

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.patch('/:id/status', controller.updateStatus);

export default router;