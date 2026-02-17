const express = require('express');
const router = express.Router();

const AppointmentsPublicController = require('../../controllers/public/appointmentsController');

// GET /public/appointments/availability?date=YYYY-MM-DD
router.get('/availability', AppointmentsPublicController.availability);

// POST /public/appointments
router.post('/', AppointmentsPublicController.create);

module.exports = router;