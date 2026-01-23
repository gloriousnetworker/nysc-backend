const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

const generateToken = (stateCode, role = 'corper') => {
  return jwt.sign(
    { stateCode, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

const sanitizeDocId = (id) => {
  return id.replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
};

module.exports = {
  generateCode,
  hashPassword,
  comparePassword,
  generateToken,
  sanitizeDocId
};