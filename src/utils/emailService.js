const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendVerificationEmail = async (email, code, name) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verify Your NYSC Account',
    html: generateVerificationTemplate(name, code),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Verification email error:', error);
    return false;
  }
};

const send2FAEmail = async (email, code, name) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Two-Factor Authentication Code',
    html: generate2FATemplate(name, code),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ 2FA email sent to: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ 2FA email error:', error);
    return false;
  }
};

const sendPasswordResetEmail = async (email, code, name) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Reset Your Password',
    html: generatePasswordResetTemplate(name, code),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Password reset email error:', error);
    return false;
  }
};

const sendWelcomeEmail = async (email, name) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Welcome to NYSC CDS Portal!',
    html: generateWelcomeTemplate(name),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Welcome email error:', error);
    return false;
  }
};

const send2FASetupEmail = async (email, name) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Two-Factor Authentication Enabled',
    html: generate2FASetupTemplate(name),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ 2FA setup email sent to: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ 2FA setup email error:', error);
    return false;
  }
};

const send2FADisabledEmail = async (email, name) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Two-Factor Authentication Disabled',
    html: generate2FADisabledTemplate(name),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ 2FA disabled email sent to: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ 2FA disabled email error:', error);
    return false;
  }
};

const sendBackupCodesEmail = async (email, name, backupCodes) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Your Backup Codes',
    html: generateBackupCodesTemplate(name, backupCodes),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Backup codes email sent to: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Backup codes email error:', error);
    return false;
  }
};

const generateVerificationTemplate = (name, code) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>NYSC Verification</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="background-color:#008753;padding:30px;text-align:center;">
                  <img src="${process.env.LOGO_URL}" alt="NYSC Logo" width="90" height="90" style="display:block;margin:0 auto 15px auto;border-radius:50%;background:#ffffff;padding:10px;">
                  <h1 style="color:#ffffff;margin:0;font-size:24px;">${process.env.APP_NAME}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:30px;color:#333333;">
                  <h2 style="margin-top:0;color:#008753;">Hello ${name},</h2>
                  <p>Please use the verification code below to complete your registration.</p>

                  <div style="background-color:#f0f0f0;border:2px dashed #008753;border-radius:8px;padding:20px;text-align:center;margin:25px 0;">
                    <div style="font-size:36px;font-weight:bold;color:#008753;letter-spacing:6px;">
                      ${code}
                    </div>
                    <p style="margin:10px 0 0 0;font-size:14px;color:#666666;">
                      This code expires in 15 minutes
                    </p>
                  </div>

                  <p>Enter this code in the NYSC CDS app to verify your email.</p>
                  <p>If you did not create an account, please ignore this email.</p>

                  <p style="margin-top:30px;">
                    Best regards,<br>
                    <strong>NYSC CDS Team</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color:#f8f8f8;padding:20px;text-align:center;font-size:12px;color:#777777;">
                  <p style="margin:0;">National Youth Service Corps</p>
                  <p style="margin:5px 0 0 0;">Community Development Service Portal</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

const generate2FATemplate = (name, code) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>2FA Code</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="background-color:#4a00e0;padding:30px;text-align:center;">
                  <img src="${process.env.LOGO_URL}" alt="NYSC Logo" width="90" height="90" style="display:block;margin:0 auto 15px auto;border-radius:50%;background:#ffffff;padding:10px;">
                  <h1 style="color:#ffffff;margin:0;font-size:24px;">Two-Factor Authentication</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:30px;color:#333333;">
                  <h2 style="margin-top:0;color:#4a00e0;">Security Alert, ${name}!</h2>
                  <p>Your two-factor authentication code is:</p>

                  <div style="background-color:#f0f0f0;border:2px dashed #4a00e0;border-radius:8px;padding:20px;text-align:center;margin:25px 0;">
                    <div style="font-size:36px;font-weight:bold;color:#4a00e0;letter-spacing:6px;">
                      ${code}
                    </div>
                    <p style="margin:10px 0 0 0;font-size:14px;color:#666666;">
                      This code expires in 5 minutes
                    </p>
                  </div>

                  <div style="background-color:#fff8e1;border-left:4px solid #ffb300;padding:15px;margin:20px 0;">
                    <p style="margin:0;color:#5d4037;">
                      <strong>⚠️ Security Notice:</strong> If you did not request this code, someone may be trying to access your account. Please change your password immediately.
                    </p>
                  </div>

                  <p>Use this code to complete your login.</p>
                  <p style="margin-top:30px;">
                    Stay secure,<br>
                    <strong>NYSC CDS Security Team</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color:#f8f8f8;padding:20px;text-align:center;font-size:12px;color:#777777;">
                  <p style="margin:0;">${process.env.APP_NAME}</p>
                  <p style="margin:5px 0 0 0;">For security reasons, never share this code</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

const generatePasswordResetTemplate = (name, code) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Reset Password</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="background-color:#d32f2f;padding:30px;text-align:center;">
                  <img src="${process.env.LOGO_URL}" alt="NYSC Logo" width="90" height="90" style="display:block;margin:0 auto 15px auto;border-radius:50%;background:#ffffff;padding:10px;">
                  <h1 style="color:#ffffff;margin:0;font-size:24px;">Password Reset Request</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:30px;color:#333333;">
                  <h2 style="margin-top:0;color:#d32f2f;">Hello ${name},</h2>
                  <p>We received a request to reset your password. Use the code below to reset your password:</p>

                  <div style="background-color:#f0f0f0;border:2px dashed #d32f2f;border-radius:8px;padding:20px;text-align:center;margin:25px 0;">
                    <div style="font-size:36px;font-weight:bold;color:#d32f2f;letter-spacing:6px;">
                      ${code}
                    </div>
                    <p style="margin:10px 0 0 0;font-size:14px;color:#666666;">
                      This code expires in 1 hour
                    </p>
                  </div>

                  <div style="background-color:#ffebee;border-left:4px solid #d32f2f;padding:15px;margin:20px 0;">
                    <p style="margin:0;color:#b71c1c;">
                      <strong>Important:</strong> If you did not request a password reset, please ignore this email and ensure your account is secure.
                    </p>
                  </div>

                  <p>Enter this code in the password reset page to create a new password.</p>

                  <p style="margin-top:30px;">
                    Best regards,<br>
                    <strong>NYSC CDS Support Team</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color:#f8f8f8;padding:20px;text-align:center;font-size:12px;color:#777777;">
                  <p style="margin:0;">${process.env.APP_NAME}</p>
                  <p style="margin:5px 0 0 0;">Need help? Contact: ${process.env.SUPPORT_EMAIL}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

const generateWelcomeTemplate = (name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Welcome</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="background:linear-gradient(135deg, #008753, #00c853);padding:30px;text-align:center;">
                  <img src="${process.env.LOGO_URL}" alt="NYSC Logo" width="90" height="90" style="display:block;margin:0 auto 15px auto;border-radius:50%;background:#ffffff;padding:10px;">
                  <h1 style="color:#ffffff;margin:0;font-size:24px;">Welcome to NYSC CDS Portal!</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:30px;color:#333333;">
                  <h2 style="margin-top:0;color:#008753;">Congratulations, ${name}!</h2>
                  <p>Your account has been successfully verified and you're now part of the NYSC CDS community.</p>

                  <div style="background-color:#e8f5e9;border:1px solid #c8e6c9;border-radius:8px;padding:20px;margin:25px 0;">
                    <h3 style="color:#2e7d32;margin-top:0;">What You Can Do:</h3>
                    <ul style="margin:10px 0;padding-left:20px;color:#555;">
                      <li>Mark your CDS attendance</li>
                      <li>View attendance records</li>
                      <li>Access NYSC resources</li>
                      <li>Connect with fellow corps members</li>
                      <li>Receive important updates</li>
                    </ul>
                  </div>

                  <div style="background-color:#e3f2fd;border:1px solid #bbdefb;border-radius:8px;padding:15px;margin:20px 0;">
                    <p style="margin:0;color:#1565c0;">
                      <strong>📱 Get Started:</strong> Download our mobile app or visit ${process.env.APP_URL}
                    </p>
                  </div>

                  <p style="margin-top:30px;">
                    We're excited to have you on board!<br>
                    <strong>The NYSC CDS Team</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color:#f8f8f8;padding:20px;text-align:center;font-size:12px;color:#777777;">
                  <p style="margin:0;">${process.env.APP_NAME}</p>
                  <p style="margin:5px 0 0 0;">Serving the nation with pride</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

const generate2FASetupTemplate = (name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>2FA Enabled</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="background:linear-gradient(135deg, #4a00e0, #8e2de2);padding:30px;text-align:center;">
                  <img src="${process.env.LOGO_URL}" alt="NYSC Logo" width="90" height="90" style="display:block;margin:0 auto 15px auto;border-radius:50%;background:#ffffff;padding:10px;">
                  <h1 style="color:#ffffff;margin:0;font-size:24px;">Two-Factor Authentication Enabled</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:30px;color:#333333;">
                  <h2 style="margin-top:0;color:#4a00e0;">Account Security Enhanced, ${name}!</h2>
                  <p>Two-factor authentication has been successfully enabled on your account.</p>

                  <div style="background-color:#f3e5f5;border:1px solid #ce93d8;border-radius:8px;padding:20px;margin:25px 0;">
                    <h3 style="color:#7b1fa2;margin-top:0;">🔒 Security Features Now Active:</h3>
                    <ul style="margin:10px 0;padding-left:20px;color:#555;">
                      <li>Authentication app (Google Authenticator/Authy)</li>
                      <li>Email verification codes</li>
                      <li>8 backup codes (saved securely)</li>
                      <li>Login notifications</li>
                    </ul>
                  </div>

                  <div style="background-color:#e8eaf6;border-left:4px solid #3f51b5;padding:15px;margin:20px 0;">
                    <p style="margin:0;color:#283593;">
                      <strong>💡 Important:</strong> 
                      <ul style="margin:10px 0;padding-left:20px;">
                        <li>Keep your backup codes in a secure location</li>
                        <li>Use authenticator app for faster logins</li>
                        <li>You'll need 2FA for every login attempt</li>
                      </ul>
                    </p>
                  </div>

                  <p>Your account is now significantly more secure against unauthorized access.</p>

                  <p style="margin-top:30px;">
                    Stay secure,<br>
                    <strong>NYSC CDS Security Team</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color:#f8f8f8;padding:20px;text-align:center;font-size:12px;color:#777777;">
                  <p style="margin:0;">${process.env.APP_NAME}</p>
                  <p style="margin:5px 0 0 0;">Security is our priority</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

const generate2FADisabledTemplate = (name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>2FA Disabled</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="background:linear-gradient(135deg, #ff6b6b, #ff8e53);padding:30px;text-align:center;">
                  <img src="${process.env.LOGO_URL}" alt="NYSC Logo" width="90" height="90" style="display:block;margin:0 auto 15px auto;border-radius:50%;background:#ffffff;padding:10px;">
                  <h1 style="color:#ffffff;margin:0;font-size:24px;">Two-Factor Authentication Disabled</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:30px;color:#333333;">
                  <h2 style="margin-top:0;color:#d32f2f;">Security Notice, ${name}!</h2>
                  <p>Two-factor authentication has been disabled on your account.</p>

                  <div style="background-color:#ffebee;border:1px solid #ffcdd2;border-radius:8px;padding:20px;margin:25px 0;">
                    <h3 style="color:#c62828;margin-top:0;">⚠️ Security Reduced</h3>
                    <p>Your account security level has been reduced. Your account is now protected only by your password.</p>
                  </div>

                  <div style="background-color:#fff8e1;border-left:4px solid #ffb300;padding:15px;margin:20px 0;">
                    <p style="margin:0;color:#5d4037;">
                      <strong>🔐 Recommended Actions:</strong>
                      <ul style="margin:10px 0;padding-left:20px;">
                        <li>Use a strong, unique password</li>
                        <li>Enable 2FA again for better security</li>
                        <li>Monitor your account activity</li>
                        <li>Report any suspicious activity immediately</li>
                      </ul>
                    </p>
                  </div>

                  <p>If you did not disable 2FA, please secure your account immediately.</p>

                  <div style="text-align:center;margin:30px 0;">
                    <a href="${process.env.APP_URL}/security" style="background-color:#008753;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;font-weight:bold;display:inline-block;">
                      Review Security Settings
                    </a>
                  </div>

                  <p style="margin-top:30px;">
                    Stay vigilant,<br>
                    <strong>NYSC CDS Security Team</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color:#f8f8f8;padding:20px;text-align:center;font-size:12px;color:#777777;">
                  <p style="margin:0;">${process.env.APP_NAME}</p>
                  <p style="margin:5px 0 0 0;">For security concerns: ${process.env.SUPPORT_EMAIL}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

const generateBackupCodesTemplate = (name, backupCodes) => {
  const codesHtml = backupCodes.map((code, index) => `
    <div style="background:#f5f5f5;padding:10px;margin:5px;border-radius:4px;font-family:monospace;font-size:16px;text-align:center;">
      ${code}
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Backup Codes</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="background:linear-gradient(135deg, #37474f, #546e7a);padding:30px;text-align:center;">
                  <img src="${process.env.LOGO_URL}" alt="NYSC Logo" width="90" height="90" style="display:block;margin:0 auto 15px auto;border-radius:50%;background:#ffffff;padding:10px;">
                  <h1 style="color:#ffffff;margin:0;font-size:24px;">Your Backup Codes</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:30px;color:#333333;">
                  <h2 style="margin-top:0;color:#37474f;">Emergency Access Codes, ${name}!</h2>
                  <p>Below are your new backup codes. Each code can be used once if you lose access to your authenticator app.</p>

                  <div style="background-color:#eceff1;border:2px dashed #78909c;border-radius:8px;padding:20px;margin:25px 0;">
                    <h3 style="color:#455a64;margin-top:0;text-align:center;">📋 Backup Codes</h3>
                    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
                      ${codesHtml}
                    </div>
                    <p style="text-align:center;margin:15px 0 0 0;color:#78909c;font-size:14px;">
                      ⚠️ Each code works only once
                    </p>
                  </div>

                  <div style="background-color:#fff3e0;border-left:4px solid #ff9800;padding:15px;margin:20px 0;">
                    <p style="margin:0;color:#e65100;">
                      <strong>🔒 Critical Security Instructions:</strong>
                      <ul style="margin:10px 0;padding-left:20px;">
                        <li><strong>Save these codes immediately</strong> - they won't be shown again</li>
                        <li>Store them in a secure password manager</li>
                        <li>Print them and keep in a safe place</li>
                        <li>Do not share these codes with anyone</li>
                        <li>Regenerate codes if you suspect they're compromised</li>
                      </ul>
                    </p>
                  </div>

                  <p>Use these codes only when you cannot access your authenticator app.</p>

                  <p style="margin-top:30px;">
                    Keep them safe,<br>
                    <strong>NYSC CDS Security Team</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color:#263238;padding:20px;text-align:center;font-size:12px;color:#cfd8dc;">
                  <p style="margin:0;">${process.env.APP_NAME} - Security Center</p>
                  <p style="margin:5px 0 0 0;">These codes provide emergency access to your account</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

module.exports = {
  sendVerificationEmail,
  send2FAEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  send2FASetupEmail,
  send2FADisabledEmail,
  sendBackupCodesEmail
};