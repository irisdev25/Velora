const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getBusinessSettings, updateBusinessSettings, uploadLogo, uploadBanner } = require('../controllers/settingsController');
const { uploadCloudinary } = require('../middleware/cloudinaryMiddleware');

router.get('/business/:businessId', getBusinessSettings);
router.put('/', authMiddleware, updateBusinessSettings);
router.post('/upload-logo', authMiddleware, uploadCloudinary.single('logo'), uploadLogo);
router.post('/upload-banner', authMiddleware, uploadCloudinary.single('banner'), uploadBanner);

module.exports = router;