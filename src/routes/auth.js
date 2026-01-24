const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth');
const {
  signup,
  verifyEmail,
  login,
  verify2FA,
  setup2FA,
  verify2FASetup,
  disable2FA,
  generateBackupCodes,
  send2FACode,
  verifyEmail2FA,
  resendCode,
  checkStatus,
  continueRegistration,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

router.post('/signup', signup);
router.post('/verify', verifyEmail);
router.post('/login', login);
router.post('/verify-2fa', verify2FA);
router.post('/setup-2fa', authMiddleware, setup2FA);
router.post('/verify-2fa-setup', verify2FASetup);
router.post('/disable-2fa', authMiddleware, disable2FA);
router.post('/generate-backup-codes', authMiddleware, generateBackupCodes);
router.post('/send-2fa-code', send2FACode);
router.post('/verify-email-2fa', verifyEmail2FA);
router.post('/resend-code', resendCode);
router.get('/status/:email', checkStatus);
router.post('/continue-registration', continueRegistration);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;