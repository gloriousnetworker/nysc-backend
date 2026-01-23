const { db } = require('../firebase');
const { 
  generateCode, 
  hashPassword, 
  comparePassword, 
  generateToken,
  generateStateCode 
} = require('../utils/helpers');
const { sendVerificationEmail } = require('../utils/emailService');

console.log('✅ Auth Controller loaded successfully');

const signup = async (req, res) => {
  console.log('📥 Signup request received:', {
    body: req.body,
    headers: req.headers
  });

  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      servingState,
      localGovernment,
      ppa,
      cdsGroup,
      password
    } = req.body;

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'servingState', 'localGovernment', 'ppa', 'cdsGroup', 'password'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      console.log('❌ Missing fields:', missingFields);
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    console.log('🔍 Checking if email exists:', email);
    const emailLower = email.toLowerCase();

    // Check if email already exists
    const existingEmail = await db.collection('corpers')
      .where('email', '==', emailLower)
      .get();

    if (!existingEmail.empty) {
      console.log('❌ Email already exists:', emailLower);
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Check if phone already exists
    console.log('🔍 Checking if phone exists:', phone);
    const existingPhone = await db.collection('corpers')
      .where('phone', '==', phone)
      .get();

    if (!existingPhone.empty) {
      console.log('❌ Phone already exists:', phone);
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered'
      });
    }

    // Generate state code and verification code
    console.log('🔧 Generating state code for:', servingState);
    const stateCode = generateStateCode(servingState);
    const verificationCode = generateCode();
    
    console.log('🔑 Hashing password...');
    const hashedPassword = await hashPassword(password);

    // Prepare corper data
    const corperData = {
      firstName,
      lastName,
      email: emailLower,
      phone,
      stateCode,
      servingState,
      localGovernment,
      ppa,
      cdsGroup,
      password: hashedPassword,
      verificationCode,
      isVerified: false,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('💾 Saving to pending_registrations:', emailLower);
    // Save to pending registrations
    await db.collection('pending_registrations').doc(emailLower).set(corperData);

    // Send verification email
    console.log('📧 Sending verification email to:', email);
    const emailSent = await sendVerificationEmail(email, verificationCode, `${firstName} ${lastName}`);

    if (!emailSent) {
      console.log('❌ Failed to send email, deleting pending registration');
      await db.collection('pending_registrations').doc(emailLower).delete();
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    console.log('✅ Signup successful for:', email);
    res.status(201).json({
      success: true,
      message: 'Registration successful! Check your email for verification code.',
      data: {
        email: emailLower,
        stateCode,
        note: 'Please check your email (including spam folder) for verification code'
      }
    });

  } catch (error) {
    console.error('🔥 Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// Other functions remain the same...
const verifyEmail = async (req, res) => {
  console.log('📥 Verify email request:', req.body);

  try {
    const { email, verificationCode } = req.body;

    if (!email || !verificationCode) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required'
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

    const { verificationCode: _, ...corperData } = pendingData;
    
    const finalData = {
      ...corperData,
      isVerified: true,
      status: 'active',
      verifiedAt: new Date().toISOString()
    };

    await db.collection('corpers').doc(pendingData.stateCode).set(finalData);
    await pendingRef.delete();

    const token = generateToken(pendingData.stateCode, pendingData.stateCode, 'corper');

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
  console.log('📥 Login request:', { identifier: req.body.identifier });

  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/State Code and password are required'
      });
    }

    let corperQuery;

    if (identifier.includes('@')) {
      corperQuery = await db.collection('corpers')
        .where('email', '==', identifier.toLowerCase())
        .get();
    } else {
      corperQuery = await db.collection('corpers')
        .where('stateCode', '==', identifier)
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

    const token = generateToken(corperData.stateCode, corperData.stateCode, 'corper');

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

    await pendingRef.update({
      verificationCode: newCode,
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
      message: 'New verification code sent to your email'
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
          name: `${data.firstName} ${data.lastName}`
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

module.exports = {
  signup,
  verifyEmail,
  login,
  resendCode,
  checkStatus
};