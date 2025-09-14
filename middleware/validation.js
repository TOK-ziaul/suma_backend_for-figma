const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone.number')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('phone.countryCode')
    .matches(/^\+\d{1,4}$/)
    .withMessage('Please provide a valid country code'),
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  handleValidationErrors
];

const validateNewPassword = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  handleValidationErrors
];

const validatePhoneVerification = [
  body('code')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Verification code must be 6 digits'),
  handleValidationErrors
];

const validateGameSubmission = [
  body('players')
    .isArray({ min: 2, max: 4 })
    .withMessage('Game must have 2-4 players'),
  body('players.*.name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Player name must be 1-50 characters'),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validatePasswordReset,
  validateNewPassword,
  validatePhoneVerification,
  validateGameSubmission,
  handleValidationErrors
};