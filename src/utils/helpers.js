const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

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

const generateToken = (userId, stateCode, role = 'corper') => {
  return jwt.sign(
    { userId, stateCode, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

const generateStateCode = (state) => {
  const statePrefix = state.substring(0, 3).toUpperCase();
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `NYSC/${statePrefix}/${year}/${random}`;
};

module.exports = {
  generateCode,
  hashPassword,
  comparePassword,
  generateToken,
  generateStateCode,
};