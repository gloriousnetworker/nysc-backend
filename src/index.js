require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const QRCode = require('qrcode');
const authRoutes = require('./routes/auth');
const { db } = require('./firebase');

const app = express();

const allowedOrigins = [
  'https://nysc-corpers-cds-attendance-app.vercel.app',
  'https://nysc-backend.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With']
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'NYSC CDS Backend API 🚀',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    isVercel: process.env.VERCEL === '1',
    frontendUrl: process.env.FRONTEND_URL,
    corsOrigins: allowedOrigins
  });
});

app.get('/api/debug/cookies', (req, res) => {
  res.json({
    success: true,
    cookies: req.cookies,
    headers: {
      cookie: req.headers.cookie,
      authorization: req.headers.authorization
    },
    environment: process.env.NODE_ENV,
    isVercel: process.env.VERCEL === '1'
  });
});

app.get('/api/debug/set-test-cookie', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    maxAge: 3600000,
    path: '/',
    sameSite: isProduction ? 'none' : 'lax'
  };
  
  res.cookie('test_cookie', 'test_value_' + Date.now(), cookieOptions);
  
  res.json({
    success: true,
    message: 'Test cookie set',
    cookieOptions,
    environment: process.env.NODE_ENV
  });
});

app.get('/api/test-qrcode', async (req, res) => {
  try {
    const testUrl = 'otpauth://totp/Test:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Test';
    const qrCode = await QRCode.toDataURL(testUrl);
    
    res.json({
      success: true,
      message: 'QR Code generation works',
      qrCode: qrCode.substring(0, 100) + '...'
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'QR Code generation failed',
      error: error.message
    });
  }
});

app.get('/api/test-firestore', async (req, res) => {
  try {
    const testDoc = await db.collection('test').doc('test').get();
    
    if (!testDoc.exists) {
      await db.collection('test').doc('test').set({
        message: 'Test successful',
        timestamp: new Date().toISOString()
      });
    }
    
    const updatedDoc = await db.collection('test').doc('test').get();
    
    res.json({
      success: true,
      message: 'Firestore connection works',
      data: updatedDoc.data()
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'Firestore connection failed',
      error: error.message
    });
  }
});

app.use('/api/auth', authRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

app.use((error, req, res, next) => {
  console.error('Server Error:', error.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;