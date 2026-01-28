const { db } = require('../firebase');
const { 
  generateCode, 
  hashPassword, 
  comparePassword, 
  generateToken,
  generateTOTPSecret,
  verifyTOTPCode,
  encryptSecret,
  decryptSecret,
  sanitizeDocId,
  validateStateCodeFormat
} = require('../utils/helpers');
const { 
  sendVerificationEmail,
  send2FAEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  send2FASetupEmail,
  send2FADisabledEmail,
  sendBackupCodesEmail
} = require('../utils/emailService');
const QRCode = require('qrcode');

const setAuthCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
    sameSite: isProduction ? 'none' : 'lax'
  };
  
  res.cookie('nysc_token', token, cookieOptions);
};

const clearAuthCookie = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    path: '/',
    sameSite: isProduction ? 'none' : 'lax'
  };
  
  res.clearCookie('nysc_token', cookieOptions);
};

const signup = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      stateCode,
      servingState,
      password,
      confirmPassword
    } = req.body;

    if (!firstName || !lastName || !email || !phone || !stateCode || !servingState || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: First Name, Last Name, Email, Phone, State Code, Serving State, Password'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (!validateStateCodeFormat(stateCode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid state code format. Use format: ST/XX/0000 (e.g., KG/25C/0001)'
      });
    }

    const emailLower = email.toLowerCase();
    const stateCodeUpper = stateCode.toUpperCase();
    const servingStateProper = servingState.trim();
    
    const safeDocId = emailLower.replace(/[^a-zA-Z0-9]/g, '_');

    const existingEmail = await db.collection('corpers')
      .where('email', '==', emailLower)
      .get();

    if (!existingEmail.empty) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const existingStateCode = await db.collection('corpers')
      .where('stateCode', '==', stateCodeUpper)
      .get();

    if (!existingStateCode.empty) {
      return res.status(400).json({
        success: false,
        message: 'State code already registered'
      });
    }

    const verificationCode = generateCode();
    const verificationExpiry = new Date(Date.now() + 15 * 60000);
    
    const hashedPassword = await hashPassword(password);

    const corperData = {
      firstName,
      lastName,
      email: emailLower,
      phone,
      stateCode: stateCodeUpper,
      servingState: servingStateProper,
      localGovernment: '',
      ppa: '',
      cdsGroup: '',
      password: hashedPassword,
      verificationCode,
      verificationExpiry: verificationExpiry.toISOString(),
      isVerified: false,
      status: 'pending',
      registrationStep: 2,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      backupCodes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.collection('pending_registrations').doc(safeDocId).set(corperData);

    const emailSent = await sendVerificationEmail(email, verificationCode, `${firstName} ${lastName}`);

    if (!emailSent) {
      await db.collection('pending_registrations').doc(safeDocId).delete();
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Check email for verification code.',
      data: {
        email: emailLower,
        stateCode: stateCodeUpper,
        servingState: servingStateProper
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { email, verificationCode } = req.body;

    if (!email || !verificationCode) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code required'
      });
    }

    const emailLower = email.toLowerCase();
    const safeDocId = emailLower.replace(/[^a-zA-Z0-9]/g, '_');
    
    const pendingRef = db.collection('pending_registrations').doc(safeDocId);
    const pendingDoc = await pendingRef.get();

    if (!pendingDoc.exists) {
      return res.status(400).json({
        success: false,
        message: 'No pending registration found'
      });
    }

    const pendingData = pendingDoc.data();

    if (pendingData.verificationCode !== verificationCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    if (new Date() > new Date(pendingData.verificationExpiry)) {
      return res.status(400).json({
        success: false,
        message: 'Verification code expired'
      });
    }

    const { verificationCode: _, verificationExpiry: __, ...corperData } = pendingData;
    
    const finalData = {
      ...corperData,
      isVerified: true,
      status: 'active',
      verifiedAt: new Date().toISOString()
    };

    const stateCodeDocId = sanitizeDocId(pendingData.stateCode);
    
    await db.collection('corpers').doc(stateCodeDocId).set(finalData);
    await pendingRef.delete();

    const token = generateToken(pendingData.stateCode, 'corper');
    setAuthCookie(res, token);

    await sendWelcomeEmail(email, `${pendingData.firstName} ${pendingData.lastName}`);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully!',
      data: {
        token,
        corper: {
          stateCode: pendingData.stateCode,
          firstName: pendingData.firstName,
          lastName: pendingData.lastName,
          email: pendingData.email,
          servingState: pendingData.servingState,
          cdsGroup: pendingData.cdsGroup,
          twoFactorEnabled: false
        }
      }
    });
  } catch (error) {
    console.error('Verify email error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during verification'
    });
  }
};

const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/State Code and password required'
      });
    }

    let corperQuery;

    if (identifier.includes('@')) {
      corperQuery = await db.collection('corpers')
        .where('email', '==', identifier.toLowerCase())
        .get();
    } else {
      corperQuery = await db.collection('corpers')
        .where('stateCode', '==', identifier.toUpperCase())
        .get();
    }

    if (corperQuery.empty) {
      return res.status(404).json({
        success: false,
        message: 'Corper not found'
      });
    }

    const corperDoc = corperQuery.docs[0];
    const corperData = corperDoc.data();

    if (!corperData.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email first'
      });
    }

    const isPasswordValid = await comparePassword(password, corperData.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    if (corperData.twoFactorEnabled) {
      const tempToken = generateToken(corperData.stateCode, 'temp', '5m');
      
      const sanitizedStateCode = sanitizeDocId(corperData.stateCode);
      
      await db.collection('temp_auth').doc(sanitizedStateCode).set({
        stateCode: corperData.stateCode,
        tempToken,
        requires2FA: true,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 5 * 60000).toISOString()
      });

      return res.status(200).json({
        success: true,
        message: 'Two-factor authentication required',
        data: {
          tempToken,
          requires2FA: true,
          stateCode: corperData.stateCode,
          twoFactorEnabled: true
        }
      });
    }

    const token = generateToken(corperData.stateCode, 'corper');
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        requires2FA: false,
        corper: {
          stateCode: corperData.stateCode,
          firstName: corperData.firstName,
          lastName: corperData.lastName,
          fullName: `${corperData.firstName} ${corperData.lastName}`,
          email: corperData.email,
          phone: corperData.phone,
          servingState: corperData.servingState,
          localGovernment: corperData.localGovernment,
          ppa: corperData.ppa,
          cdsGroup: corperData.cdsGroup,
          status: corperData.status,
          twoFactorEnabled: corperData.twoFactorEnabled
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

const verify2FA = async (req, res) => {
  try {
    const { stateCode, twoFactorCode, tempToken } = req.body;

    if (!stateCode || !twoFactorCode || !tempToken) {
      return res.status(400).json({
        success: false,
        message: 'State code, 2FA code and temporary token required'
      });
    }

    const sanitizedStateCode = sanitizeDocId(stateCode);
    const tempAuthRef = db.collection('temp_auth').doc(sanitizedStateCode);
    const tempAuthDoc = await tempAuthRef.get();

    if (!tempAuthDoc.exists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired temporary token'
      });
    }

    const tempAuthData = tempAuthDoc.data();

    if (tempAuthData.tempToken !== tempToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid temporary token'
      });
    }

    if (new Date() > new Date(tempAuthData.expiresAt)) {
      await tempAuthRef.delete();
      return res.status(400).json({
        success: false,
        message: 'Temporary token expired'
      });
    }

    const stateCodeDocId = sanitizeDocId(stateCode);
    const corperDoc = await db.collection('corpers').doc(stateCodeDocId).get();

    if (!corperDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Corper not found'
      });
    }

    const corperData = corperDoc.data();

    if (!corperData.twoFactorEnabled || !corperData.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication not enabled'
      });
    }

    const decryptedSecret = decryptSecret(corperData.twoFactorSecret);
    const isValid = verifyTOTPCode(decryptedSecret, twoFactorCode);

    if (!isValid) {
      const isValidBackupCode = corperData.backupCodes && 
        corperData.backupCodes.includes(twoFactorCode);
      
      if (isValidBackupCode) {
        await corperDoc.ref.update({
          backupCodes: corperData.backupCodes.filter(code => code !== twoFactorCode),
          updatedAt: new Date().toISOString()
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid two-factor code'
        });
      }
    }

    await tempAuthRef.delete();

    const token = generateToken(corperData.stateCode, 'corper');
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Two-factor authentication successful',
      data: {
        token,
        corper: {
          stateCode: corperData.stateCode,
          firstName: corperData.firstName,
          lastName: corperData.lastName,
          fullName: `${corperData.firstName} ${corperData.lastName}`,
          email: corperData.email,
          phone: corperData.phone,
          servingState: corperData.servingState,
          localGovernment: corperData.localGovernment,
          ppa: corperData.ppa,
          cdsGroup: corperData.cdsGroup,
          status: corperData.status,
          twoFactorEnabled: corperData.twoFactorEnabled
        }
      }
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during 2FA verification'
    });
  }
};

const setup2FA = async (req, res) => {
  try {
    console.log('=== SETUP 2FA STARTED ===');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('User from middleware:', JSON.stringify(req.user));
    console.log('Cookies present:', !!req.cookies?.nysc_token);
    console.log('ENCRYPTION_KEY exists:', !!process.env.ENCRYPTION_KEY);
    console.log('ENCRYPTION_KEY length:', process.env.ENCRYPTION_KEY ? process.env.ENCRYPTION_KEY.length : 0);
    
    if (!req.user) {
      console.log('ERROR: No user in request');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const { stateCode } = req.user;
    console.log('StateCode from user:', stateCode);

    if (!stateCode) {
      console.log('ERROR: No stateCode in req.user');
      return res.status(400).json({
        success: false,
        message: 'State code required'
      });
    }

    console.log('Sanitizing stateCode...');
    const stateCodeDocId = sanitizeDocId(stateCode);
    console.log('Sanitized ID:', stateCodeDocId);
    
    console.log('Fetching user from Firestore...');
    const corperDoc = await db.collection('corpers').doc(stateCodeDocId).get();
    console.log('Document exists:', corperDoc.exists);

    if (!corperDoc.exists) {
      console.log('ERROR: User not found in database');
      return res.status(404).json({
        success: false,
        message: 'Corper not found'
      });
    }

    const corperData = corperDoc.data();
    console.log('User found - email:', corperData.email);
    console.log('User found - 2FA enabled:', corperData.twoFactorEnabled);

    if (corperData.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication already enabled'
      });
    }

    console.log('Generating TOTP secret...');
    const secret = generateTOTPSecret();
    console.log('Secret generated:', secret);
    
    console.log('Testing encryption...');
    let encryptedSecret;
    try {
      encryptedSecret = encryptSecret(secret);
      console.log('Encryption successful');
      console.log('Encrypted secret (first 20 chars):', encryptedSecret.substring(0, 20));
    } catch (encryptError) {
      console.error('ENCRYPTION FAILED:', encryptError);
      console.error('Encryption error stack:', encryptError.stack);
      throw new Error(`Encryption failed: ${encryptError.message}`);
    }
    
    console.log('Testing decryption...');
    try {
      const decryptedTest = decryptSecret(encryptedSecret);
      console.log('Decryption test successful');
      console.log('Original vs decrypted match:', decryptedTest === secret);
    } catch (decryptError) {
      console.error('DECRYPTION TEST FAILED:', decryptError);
      console.error('Decryption error stack:', decryptError.stack);
    }
    
    console.log('Generating backup codes...');
    const backupCodes = Array.from({ length: 8 }, () => 
      Math.floor(100000 + Math.random() * 900000).toString()
    );
    console.log('Backup codes generated:', backupCodes);

    const otpauthUrl = `otpauth://totp/${encodeURIComponent(process.env.APP_NAME)}:${encodeURIComponent(corperData.email)}?secret=${secret}&issuer=${encodeURIComponent(process.env.TOTP_ISSUER)}&algorithm=SHA1&digits=6&period=30`;
    console.log('OTPAuth URL:', otpauthUrl);
    
    console.log('Generating QR code...');
    let qrCodeDataUrl;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
      console.log('QR code generated successfully');
      console.log('QR code size:', qrCodeDataUrl.length, 'chars');
    } catch (qrError) {
      console.error('QR Code generation failed:', qrError);
      throw new Error(`QR Code generation failed: ${qrError.message}`);
    }

    console.log('Updating Firestore...');
    try {
      await corperDoc.ref.update({
        twoFactorSecret: encryptedSecret,
        backupCodes,
        updatedAt: new Date().toISOString()
      });
      console.log('Firestore updated successfully');
    } catch (firestoreError) {
      console.error('Firestore update failed:', firestoreError);
      throw new Error(`Firestore update failed: ${firestoreError.message}`);
    }

    console.log('=== SETUP 2FA SUCCESS ===');
    
    // Return a simplified response for production debugging
    const responseData = {
      secret,
      qrCode: qrCodeDataUrl.substring(0, 100) + '...',
      backupCodes,
      stateCode: corperData.stateCode,
      email: corperData.email
    };
    
    // In production, hide full QR code
    if (process.env.NODE_ENV === 'production') {
      responseData.qrCode = 'data:image/png;base64,[TRUNCATED]';
    }
    
    res.status(200).json({
      success: true,
      message: 'Two-factor authentication setup initiated',
      data: responseData
    });
  } catch (error) {
    console.error('=== SETUP 2FA ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('Environment variables:');
    console.error('- APP_NAME:', process.env.APP_NAME);
    console.error('- TOTP_ISSUER:', process.env.TOTP_ISSUER);
    console.error('- NODE_ENV:', process.env.NODE_ENV);
    console.error('- ENCRYPTION_KEY present:', !!process.env.ENCRYPTION_KEY);
    
    res.status(500).json({
      success: false,
      message: 'Server error during 2FA setup',
      // Include detailed error for debugging
      ...(process.env.NODE_ENV !== 'production' && {
        error: error.message,
        errorType: error.name,
        stack: error.stack
      })
    });
  }
};

const verify2FASetup = async (req, res) => {
  try {
    const { stateCode, twoFactorCode } = req.body;

    if (!stateCode || !twoFactorCode) {
      return res.status(400).json({
        success: false,
        message: 'State code and 2FA code required'
      });
    }

    const stateCodeDocId = sanitizeDocId(stateCode);
    const corperDoc = await db.collection('corpers').doc(stateCodeDocId).get();

    if (!corperDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Corper not found'
      });
    }

    const corperData = corperDoc.data();

    if (!corperData.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication not setup'
      });
    }

    const decryptedSecret = decryptSecret(corperData.twoFactorSecret);
    const isValid = verifyTOTPCode(decryptedSecret, twoFactorCode);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid two-factor code'
      });
    }

    await corperDoc.ref.update({
      twoFactorEnabled: true,
      updatedAt: new Date().toISOString()
    });

    await send2FASetupEmail(corperData.email, `${corperData.firstName} ${corperData.lastName}`);

    res.status(200).json({
      success: true,
      message: 'Two-factor authentication enabled successfully',
      data: {
        stateCode: corperData.stateCode,
        twoFactorEnabled: true
      }
    });
  } catch (error) {
    console.error('2FA verification setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during 2FA setup verification'
    });
  }
};

const disable2FA = async (req, res) => {
  try {
    const { stateCode } = req.user;
    const { twoFactorCode } = req.body;

    if (!stateCode || !twoFactorCode) {
      return res.status(400).json({
        success: false,
        message: 'State code and 2FA code required'
      });
    }

    const stateCodeDocId = sanitizeDocId(stateCode);
    const corperDoc = await db.collection('corpers').doc(stateCodeDocId).get();

    if (!corperDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Corper not found'
      });
    }

    const corperData = corperDoc.data();

    if (!corperData.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication not enabled'
      });
    }

    const decryptedSecret = decryptSecret(corperData.twoFactorSecret);
    const isValid = verifyTOTPCode(decryptedSecret, twoFactorCode);

    if (!isValid) {
      const isValidBackupCode = corperData.backupCodes && 
        corperData.backupCodes.includes(twoFactorCode);
      
      if (!isValidBackupCode) {
        return res.status(400).json({
          success: false,
          message: 'Invalid two-factor code'
        });
      }
    }

    await corperDoc.ref.update({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      backupCodes: [],
      updatedAt: new Date().toISOString()
    });

    await send2FADisabledEmail(corperData.email, `${corperData.firstName} ${corperData.lastName}`);

    res.status(200).json({
      success: true,
      message: 'Two-factor authentication disabled successfully',
      data: {
        stateCode: corperData.stateCode,
        twoFactorEnabled: false
      }
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during 2FA disable'
    });
  }
};

const generateBackupCodes = async (req, res) => {
  try {
    const { stateCode } = req.user;

    if (!stateCode) {
      return res.status(400).json({
        success: false,
        message: 'State code required'
      });
    }

    const stateCodeDocId = sanitizeDocId(stateCode);
    const corperDoc = await db.collection('corpers').doc(stateCodeDocId).get();

    if (!corperDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Corper not found'
      });
    }

    const corperData = corperDoc.data();

    if (!corperData.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication not enabled'
      });
    }

    const backupCodes = Array.from({ length: 8 }, () => 
      Math.floor(100000 + Math.random() * 900000).toString()
    );

    await corperDoc.ref.update({
      backupCodes,
      updatedAt: new Date().toISOString()
    });

    await sendBackupCodesEmail(corperData.email, `${corperData.firstName} ${corperData.lastName}`, backupCodes);

    res.status(200).json({
      success: true,
      message: 'Backup codes generated successfully',
      data: {
        backupCodes,
        stateCode: corperData.stateCode
      }
    });
  } catch (error) {
    console.error('Backup codes generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during backup codes generation'
    });
  }
};

const send2FACode = async (req, res) => {
  try {
    const { stateCode } = req.body;

    if (!stateCode) {
      return res.status(400).json({
        success: false,
        message: 'State code required'
      });
    }

    const stateCodeDocId = sanitizeDocId(stateCode);
    const corperDoc = await db.collection('corpers').doc(stateCodeDocId).get();

    if (!corperDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Corper not found'
      });
    }

    const corperData = corperDoc.data();

    if (!corperData.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication not enabled'
      });
    }

    const twoFactorCode = generateCode();
    
    const sanitizedStateCode = sanitizeDocId(stateCode);
    await db.collection('temp_2fa_codes').doc(sanitizedStateCode).set({
      stateCode,
      code: twoFactorCode,
      expiresAt: new Date(Date.now() + 5 * 60000).toISOString(),
      createdAt: new Date().toISOString()
    });

    const emailSent = await send2FAEmail(corperData.email, twoFactorCode, `${corperData.firstName} ${corperData.lastName}`);

    if (!emailSent) {
      await db.collection('temp_2fa_codes').doc(sanitizedStateCode).delete();
      return res.status(500).json({
        success: false,
        message: 'Failed to send 2FA code'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Two-factor authentication code sent to email'
    });
  } catch (error) {
    console.error('Send 2FA code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during 2FA code sending'
    });
  }
};

const verifyEmail2FA = async (req, res) => {
  try {
    const { stateCode, twoFactorCode } = req.body;

    if (!stateCode || !twoFactorCode) {
      return res.status(400).json({
        success: false,
        message: 'State code and 2FA code required'
      });
    }

    const sanitizedStateCode = sanitizeDocId(stateCode);
    const temp2FARef = db.collection('temp_2fa_codes').doc(sanitizedStateCode);
    const temp2FADoc = await temp2FARef.get();

    if (!temp2FADoc.exists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired 2FA code'
      });
    }

    const temp2FAData = temp2FADoc.data();

    if (temp2FAData.code !== twoFactorCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid two-factor code'
      });
    }

    if (new Date() > new Date(temp2FAData.expiresAt)) {
      await temp2FARef.delete();
      return res.status(400).json({
        success: false,
        message: 'Two-factor code expired'
      });
    }

    await temp2FARef.delete();

    const tempToken = generateToken(stateCode, 'temp', '5m');
    
    const sanitizedStateCodeForAuth = sanitizeDocId(stateCode);
    await db.collection('temp_auth').doc(sanitizedStateCodeForAuth).set({
      stateCode,
      tempToken,
      requires2FA: true,
      email2FACodeUsed: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60000).toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Email two-factor authentication successful',
      data: {
        tempToken,
        stateCode
      }
    });
  } catch (error) {
    console.error('Email 2FA verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email 2FA verification'
    });
  }
};

const resendCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const emailLower = email.toLowerCase();
    const safeDocId = emailLower.replace(/[^a-zA-Z0-9]/g, '_');
    
    const pendingRef = db.collection('pending_registrations').doc(safeDocId);
    const pendingDoc = await pendingRef.get();

    if (!pendingDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'No pending registration found'
      });
    }

    const pendingData = pendingDoc.data();
    const newCode = generateCode();
    const newExpiry = new Date(Date.now() + 15 * 60000);

    await pendingRef.update({
      verificationCode: newCode,
      verificationExpiry: newExpiry.toISOString(),
      updatedAt: new Date().toISOString()
    });

    const emailSent = await sendVerificationEmail(email, newCode, `${pendingData.firstName} ${pendingData.lastName}`);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send new code'
      });
    }

    res.status(200).json({
      success: true,
      message: 'New verification code sent'
    });
  } catch (error) {
    console.error('Resend code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const checkStatus = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const emailLower = email.toLowerCase();
    const safeDocId = emailLower.replace(/[^a-zA-Z0-9]/g, '_');

    const pendingDoc = await db.collection('pending_registrations').doc(safeDocId).get();
    
    if (pendingDoc.exists) {
      const data = pendingDoc.data();
      return res.status(200).json({
        success: true,
        data: {
          status: 'pending',
          email: data.email,
          stateCode: data.stateCode,
          servingState: data.servingState,
          name: `${data.firstName} ${data.lastName}`,
          step: data.registrationStep || 2,
          twoFactorEnabled: data.twoFactorEnabled
        }
      });
    }

    const corperQuery = await db.collection('corpers')
      .where('email', '==', emailLower)
      .get();

    if (!corperQuery.empty) {
      const data = corperQuery.docs[0].data();
      return res.status(200).json({
        success: true,
        data: {
          status: 'verified',
          email: data.email,
          stateCode: data.stateCode,
          servingState: data.servingState,
          name: `${data.firstName} ${data.lastName}`,
          twoFactorEnabled: data.twoFactorEnabled
        }
      });
    }

    res.status(404).json({
      success: false,
      message: 'No registration found'
    });
  } catch (error) {
    console.error('Check status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const continueRegistration = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const emailLower = email.toLowerCase();
    const safeDocId = emailLower.replace(/[^a-zA-Z0-9]/g, '_');
    
    const pendingRef = db.collection('pending_registrations').doc(safeDocId);
    const pendingDoc = await pendingRef.get();

    if (!pendingDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'No pending registration found'
      });
    }

    const pendingData = pendingDoc.data();
    const newCode = generateCode();
    const newExpiry = new Date(Date.now() + 15 * 60000);

    await pendingRef.update({
      verificationCode: newCode,
      verificationExpiry: newExpiry.toISOString(),
      updatedAt: new Date().toISOString()
    });

    const emailSent = await sendVerificationEmail(email, newCode, `${pendingData.firstName} ${pendingData.lastName}`);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification code'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification code resent. Check your email.',
      data: {
        email: emailLower,
        stateCode: pendingData.stateCode,
        servingState: pendingData.servingState
      }
    });
  } catch (error) {
    console.error('Continue registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const emailLower = email.toLowerCase();
    const corperQuery = await db.collection('corpers')
      .where('email', '==', emailLower)
      .get();

    if (corperQuery.empty) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }

    const corperDoc = corperQuery.docs[0];
    const corperData = corperDoc.data();
    
    const resetCode = generateCode();
    const resetExpiry = new Date(Date.now() + 60 * 60000);

    await db.collection('password_resets').doc(emailLower).set({
      email: emailLower,
      resetCode,
      resetExpiry: resetExpiry.toISOString(),
      createdAt: new Date().toISOString()
    });

    const emailSent = await sendPasswordResetEmail(email, resetCode, `${corperData.firstName} ${corperData.lastName}`);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send reset code'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset code sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, resetCode, newPassword, confirmPassword } = req.body;

    if (!email || !resetCode || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    const emailLower = email.toLowerCase();
    const resetRef = db.collection('password_resets').doc(emailLower);
    const resetDoc = await resetRef.get();

    if (!resetDoc.exists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code'
      });
    }

    const resetData = resetDoc.data();

    if (resetData.resetCode !== resetCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset code'
      });
    }

    if (new Date() > new Date(resetData.resetExpiry)) {
      await resetRef.delete();
      return res.status(400).json({
        success: false,
        message: 'Reset code expired'
      });
    }

    const corperQuery = await db.collection('corpers')
      .where('email', '==', emailLower)
      .get();

    if (corperQuery.empty) {
      return res.status(404).json({
        success: false,
        message: 'Corper not found'
      });
    }

    const corperDoc = corperQuery.docs[0];
    const hashedPassword = await hashPassword(newPassword);

    await corperDoc.ref.update({
      password: hashedPassword,
      updatedAt: new Date().toISOString()
    });

    await resetRef.delete();

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getMe = async (req, res) => {
  try {
    const { stateCode } = req.user;

    if (!stateCode) {
      return res.status(400).json({
        success: false,
        message: 'State code required'
      });
    }

    const stateCodeDocId = sanitizeDocId(stateCode);
    const corperDoc = await db.collection('corpers').doc(stateCodeDocId).get();

    if (!corperDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Corper not found'
      });
    }

    const corperData = corperDoc.data();

    res.status(200).json({
      success: true,
      data: {
        corper: {
          stateCode: corperData.stateCode,
          firstName: corperData.firstName,
          lastName: corperData.lastName,
          fullName: `${corperData.firstName} ${corperData.lastName}`,
          email: corperData.email,
          phone: corperData.phone,
          servingState: corperData.servingState,
          localGovernment: corperData.localGovernment,
          ppa: corperData.ppa,
          cdsGroup: corperData.cdsGroup,
          status: corperData.status,
          twoFactorEnabled: corperData.twoFactorEnabled
        }
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const logout = async (req, res) => {
  try {
    clearAuthCookie(res);
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

module.exports = {
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
  resetPassword,
  getMe,
  logout
};