import express from 'express';
import * as expenseController from '../../controllers/admin/expenseController.js';

const router = express.Router();

router.get('/', expenseController.list);
router.post('/', expenseController.create);

export default router;
