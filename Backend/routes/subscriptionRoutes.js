// Backend/routes/subscriptionRoutes.js
const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const auth = require('../middleware/authMiddleware');

router.get('/plans', subscriptionController.getPlans);
router.post('/create-checkout-session', auth, subscriptionController.createCheckoutSession);
router.post('/create-portal-session', auth, subscriptionController.createPortalSession);
router.post('/admin/update-plan', auth, subscriptionController.updateUserPlan);

module.exports = router;
