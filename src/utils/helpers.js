const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');

const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const comparePassword = async (password, hashed) => {
  return await bcrypt.compare(password, hashed);
};

const generateToken = (stateCode, role = 'corper', expiresIn = process.env.JWT_EXPIRES_IN) => {
  return jwt.sign(
    { stateCode, role },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

const generateTOTPSecret = () => {
  return speakeasy.generateSecret({
    length: 20,
    name: process.env.TOTP_ISSUER,
    issuer: process.env.APP_NAME
  }).base32;
};

const verifyTOTPCode = (secret, code) => {
  try {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1
    });
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
};

const encryptSecret = (secret) => {
  try {
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY).digest('base64').slice(0, 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return Buffer.from(secret).toString('base64');
  }
};

const decryptSecret = (encryptedSecret) => {
  try {
    if (encryptedSecret.includes(':')) {
      const parts = encryptedSecret.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const key = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY).digest('base64').slice(0, 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } else {
      return Buffer.from(encryptedSecret, 'base64').toString('utf8');
    }
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedSecret;
  }
};

const sanitizeDocId = (id) => {
  return id.replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
};

const validateStateCodeFormat = (stateCode) => {
  const pattern = /^[A-Z]{2}\/\d{2}[A-Z]?\/\d{4}$/i;
  return pattern.test(stateCode);
};

module.exports = {
  generateCode,
  hashPassword,
  comparePassword,
  generateToken,
  sanitizeDocId,
  generateTOTPSecret,
  verifyTOTPCode,
  encryptSecret,
  decryptSecret,
  validateStateCodeFormat
};