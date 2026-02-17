const express = require('express');
const router = express.Router();
const MechanicsController = require('../../controllers/admin/mechanicsController');

router.get('/', MechanicsController.list);
router.post('/', MechanicsController.create);
router.put('/:id', MechanicsController.update);
router.delete('/:id', MechanicsController.remove);

module.exports = router;