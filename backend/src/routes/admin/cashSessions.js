import express from 'express';
const router = express.Router();
import * as controller from '../../controllers/admin/cashSessionController.js';

router.get('/current', controller.getCurrentSession);
router.post('/open', controller.openSession);
router.post('/close', controller.closeSession);

export default router;
