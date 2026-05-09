const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(err);

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  res.status(statusCode).json({
    message: err.message || 'Error interno del servidor',
    // Opcional: mostrar stack trace solo en desarrollo
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = errorHandler;
