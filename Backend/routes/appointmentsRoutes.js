const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getAppointments, createAppointment, cancelAppointment, updateAppointmentStatus, getOccupiedSlots } = require('../controllers/appointmentsController');

const { validateAppointment } = require('../middleware/validators');

router.get('/', authMiddleware, getAppointments);
router.get('/occupied', getOccupiedSlots);
router.post('/', validateAppointment, createAppointment);
router.get('/cancel/:token', cancelAppointment);
router.patch('/:id', authMiddleware, updateAppointmentStatus);

module.exports = router;