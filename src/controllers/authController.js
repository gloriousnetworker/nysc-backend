const { db } = require('../firebase');
const { 
  generateCode, 
  hashPassword, 
  comparePassword, 
  generateToken
} = require('../utils/helpers');
const { sendVerificationEmail } = require('../utils/emailService');

console.log('✅ Auth Controller loaded successfully');

const signup = async (req, res) => {
  console.log('📥 Signup request received:', req.body);

  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      stateCode,
      servingState,
      localGovernment,
      ppa,
      cdsGroup,
      password,
      confirmPassword
    } = req.body;

    if (!firstName || !lastName || !email || !phone || !stateCode || 
        !servingState || !localGovernment || !ppa || !cdsGroup || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    const emailLower = email.toLowerCase();

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
      .where('stateCode', '==', stateCode.toUpperCase())
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
      stateCode: stateCode.toUpperCase(),
      servingState,
      localGovernment,
      ppa,
      cdsGroup,
      password: hashedPassword,
      verificationCode,
      verificationExpiry: verificationExpiry.toISOString(),
      isVerified: false,
      status: 'pending',
      registrationStep: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.collection('pending_registrations').doc(emailLower).set(corperData);

    const emailSent = await sendVerificationEmail(email, verificationCode, `${firstName} ${lastName}`);

    if (!emailSent) {
      await db.collection('pending_registrations').doc(emailLower).delete();
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
        stateCode: stateCode.toUpperCase()
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
  console.log('📥 Verify email request:', req.body);

  try {
    const { email, verificationCode } = req.body;

    if (!email || !verificationCode) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code required'
      });
    }

    const emailLower = email.toLowerCase();
    const pendingRef = db.collection('pending_registrations').doc(emailLower);
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

    await db.collection('corpers').doc(pendingData.stateCode).set(finalData);
    await pendingRef.delete();

    const token = generateToken(pendingData.stateCode, 'corper');

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
          cdsGroup: pendingData.cdsGroup
        }
      }
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during verification'
    });
  }
};

const login = async (req, res) => {
  console.log('📥 Login request:', req.body);

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

    const token = generateToken(corperData.stateCode, 'corper');

    res.status(200).json({
      success: true,
      message: 'Login successful',
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
          status: corperData.status
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

const resendCode = async (req, res) => {
  console.log('📥 Resend code request:', req.body);

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const emailLower = email.toLowerCase();
    const pendingRef = db.collection('pending_registrations').doc(emailLower);
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
  console.log('📥 Check status request:', req.params);

  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const emailLower = email.toLowerCase();

    const pendingDoc = await db.collection('pending_registrations').doc(emailLower).get();
    
    if (pendingDoc.exists) {
      const data = pendingDoc.data();
      return res.status(200).json({
        success: true,
        data: {
          status: 'pending',
          email: data.email,
          stateCode: data.stateCode,
          name: `${data.firstName} ${data.lastName}`,
          step: data.registrationStep || 2
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
          name: `${data.firstName} ${data.lastName}`
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
  console.log('📥 Continue registration:', req.body);

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const emailLower = email.toLowerCase();
    const pendingRef = db.collection('pending_registrations').doc(emailLower);
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
        stateCode: pendingData.stateCode
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
  console.log('📥 Forgot password:', req.body);

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

    const emailSent = await sendVerificationEmail(email, resetCode, `${corperData.firstName} ${corperData.lastName}`);

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
  console.log('📥 Reset password:', req.body);

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

module.exports = {
  signup,
  verifyEmail,
  login,
  resendCode,
  checkStatus,
  continueRegistration,
  forgotPassword,
  resetPassword
};