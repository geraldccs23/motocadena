import express from 'express';
const router = express.Router();
import * as controller from '../../controllers/admin/appointmentsController.js';

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getById);

export default router;