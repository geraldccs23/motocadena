const express = require('express');
const router = express.Router();

const ServicesPublicController = require('../../controllers/public/servicesController');

// GET /public/services
router.get('/', ServicesPublicController.list);

module.exports = router;