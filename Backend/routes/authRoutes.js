const express = require('express');
const router = express.Router();
const { 
  validate, 
  registerValidationRules, 
  loginValidationRules,
  forgotPasswordValidationRules,
  resetPasswordValidationRules 
} = require('../middleware/validators');
const { register, login, verifyEmail, forgotPassword, resetPassword } = require('../controllers/authController');

router.post('/register', registerValidationRules, validate, register);
router.post('/login', loginValidationRules, validate, login);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPasswordValidationRules, validate, forgotPassword);
router.post('/reset-password', resetPasswordValidationRules, validate, resetPassword);

module.exports = router;