const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getServices, createService, deleteService, getPublicServices, getServiceDetails, updateService } = require('../controllers/servicesController');

// Ruta pública para obtener servicios (sin autenticación)
router.get('/public', getPublicServices);

// Rutas protegidas (requieren autenticación)
router.get('/', authMiddleware, getServices);
router.get('/:id', authMiddleware, getServiceDetails);
router.post('/', authMiddleware, createService);
router.patch('/:id', authMiddleware, updateService);
router.delete('/:id', authMiddleware, deleteService);

module.exports = router;