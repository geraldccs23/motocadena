import express from 'express';
const router = express.Router();
import * as controller from '../../controllers/admin/clientsController.js';

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;