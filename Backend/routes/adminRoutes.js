const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/authMiddleware');

router.get('/stats', auth, adminController.getGlobalStats);

module.exports = router;
