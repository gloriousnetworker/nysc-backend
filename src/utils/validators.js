const { body } = require('express-validator');

const signupValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').matches(/^[0-9]{11}$/).withMessage('Valid phone number is required (11 digits)'),
  body('stateCode').trim().notEmpty().withMessage('State code is required'),
  body('servingState').trim().notEmpty().withMessage('Serving state is required'),
  body('localGovernment').trim().notEmpty().withMessage('Local government is required'),
  body('ppa').trim().notEmpty().withMessage('PPA is required'),
  body('cdsGroup').trim().notEmpty().withMessage('CDS group is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/\d/)
    .withMessage('Password must contain a number'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
];

const loginValidation = [
  body('identifier').trim().notEmpty().withMessage('Email or state code is required'),
  body('password').trim().notEmpty().withMessage('Password is required'),
];

const verifyEmailValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('verificationCode').isLength({ min: 6, max: 6 }).withMessage('6-digit code required'),
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
];

const resetPasswordValidation = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/\d/)
    .withMessage('Password must contain a number'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
];

module.exports = {
  signupValidation,
  loginValidation,
  verifyEmailValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
};