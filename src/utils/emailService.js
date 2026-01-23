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
  const logoUrl = 'https://res.cloudinary.com/do4przxhk/image/upload/v1769164646/nysc-logo_cgivi4.png';

  const mailOptions = {
    from: `"NYSC CDS Portal" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your NYSC Account',
    html: `
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
                    <img src="${logoUrl}" alt="NYSC Logo" width="90" height="90" style="display:block;margin:0 auto 15px auto;border-radius:50%;background:#ffffff;padding:10px;">
                    <h1 style="color:#ffffff;margin:0;font-size:24px;">NYSC CDS Attendance Portal</h1>
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
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

module.exports = { sendVerificationEmail };
