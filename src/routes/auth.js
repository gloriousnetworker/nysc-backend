const express = require('express');
const router = express.Router();
const {
  signup,
  verifyEmail,
  login,
  resendCode,
  checkStatus,
  continueRegistration,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

router.post('/signup', signup);
router.post('/verify', verifyEmail);
router.post('/login', login);
router.post('/resend-code', resendCode);
router.get('/status/:email', checkStatus);
router.post('/continue-registration', continueRegistration);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;