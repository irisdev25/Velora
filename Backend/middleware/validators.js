const { body, validationResult } = require('express-validator');

// Middleware genérico para manejar los errores de validación
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Reglas de validación para Citas
const validateAppointment = [
  body('user_id').isInt().withMessage('ID de negocio inválido'),
  body('service_id').isInt().withMessage('ID de servicio inválido'),
  body('client_name').trim().notEmpty().withMessage('El nombre es obligatorio'),
  body('client_email').isEmail().withMessage('Email inválido'),
  body('client_phone').notEmpty().withMessage('El teléfono es obligatorio'),
  body('appointment_date').isDate().withMessage('Fecha inválida (formato YYYY-MM-DD)'),
  body('appointment_time').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Hora inválida (formato HH:MM)'),
  validate
];

// Reglas de validación para Autenticación
const registerValidationRules = [
  body('name').notEmpty().withMessage('El nombre es obligatorio'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
];

const loginValidationRules = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('La contraseña es obligatoria')
];

const forgotPasswordValidationRules = [
  body('email').isEmail().withMessage('Email inválido')
];

const resetPasswordValidationRules = [
  body('token').notEmpty().withMessage('El token es obligatorio'),
  body('password').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres')
];

module.exports = {
  validate,
  validateAppointment,
  registerValidationRules,
  loginValidationRules,
  forgotPasswordValidationRules,
  resetPasswordValidationRules
};
