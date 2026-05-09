const express = require('express');
const router = express.Router();
const { getBusinessTypes, getBusinessTypeFields } = require('../controllers/businessController');

router.get('/', getBusinessTypes);
router.get('/:id/fields', getBusinessTypeFields);

module.exports = router;
