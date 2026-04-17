import express from 'express';
const router = express.Router();
import * as controller from '../../controllers/admin/servicesController.js';

router.get('/', controller.list);
router.post('/', controller.create);

export default router;