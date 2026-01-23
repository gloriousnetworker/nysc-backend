const admin = require('firebase-admin');

try {
  let serviceAccount;
  
  if (process.env.NODE_ENV === 'production') {
    serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CONFIG);
  } else {
    serviceAccount = require('../firebase-admin.json');
  }
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };