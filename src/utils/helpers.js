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
  const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

const decryptSecret = (encryptedSecret) => {
  try {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedSecret, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt secret');
  }
};

const sanitizeDocId = (id) => {
  return id.replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
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
  decryptSecret
};