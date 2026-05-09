// Backend/routes/customerRoutes.js
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, customerController.getCustomers);
router.get('/:id', auth, customerController.getCustomerDetails);
router.put('/:id/notes', auth, customerController.updateNotes);
router.get('/actions/export', auth, customerController.exportCustomers);

module.exports = router;
