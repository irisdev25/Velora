const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getResources, createResource } = require('../controllers/resourceController');

router.get('/', authMiddleware, getResources);
router.post('/', authMiddleware, createResource);

module.exports = router;
