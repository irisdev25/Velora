const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

const upload = require('../middleware/uploadMiddleware');

// Diagnostic route
router.get('/ping', (req, res) => res.json({ status: 'ok', message: 'Payment router is active' }));

// Webhook must use raw body to verify signature
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

// Session creation needs JSON parsing
router.post('/create-checkout-session', express.json(), paymentController.createCheckoutSession);

// Manual Payment proof upload
router.post('/upload-proof', upload.single('proof'), paymentController.uploadProofOfPayment);

module.exports = router;
