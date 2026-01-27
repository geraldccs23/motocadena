const express = require('express');
const router = express.Router();

const OrdersPublicController = require('../../controllers/public/ordersController');

// GET /public/orders/by-plate/:plate
router.get('/by-plate/:plate', OrdersPublicController.getByPlate);

module.exports = router;