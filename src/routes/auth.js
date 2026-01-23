const express = require('express');
const router = express.Router();
const {
  signup,
  verifyEmail,
  login,
  resendCode,
  checkStatus
} = require('../controllers/authController');

router.post('/signup', signup);
router.post('/verify', verifyEmail);
router.post('/login', login);
router.post('/resend-code', resendCode);
router.get('/status/:email', checkStatus);

module.exports = router;