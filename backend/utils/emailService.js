const nodemailer = require('nodemailer');

// Email configuration from environment variables
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
};

// Create transporter
let transporter = null;

const initializeTransporter = () => {
  if (emailConfig.auth.user && emailConfig.auth.pass) {
    transporter = nodemailer.createTransport(emailConfig);
    console.log('✅ Email service configured');
    return true;
  }
  console.log('⚠️ Email not configured - set SMTP_USER and SMTP_PASS in .env');
  return false;
};

// Initialize on module load
initializeTransporter();

/**
 * Send fire alert email
 */
const sendFireAlert = async (options) => {
  if (!transporter) {
    console.log('Email not configured, skipping alert');
    return { success: false, error: 'Email not configured' };
  }

  const {
    to,
    detection,
    imageUrl,
    cameraId = 'Camera 1'
  } = options;

  const confidence = detection.maxConfidence 
    ? (detection.maxConfidence * 100).toFixed(1) 
    : 'N/A';

  const alertLevel = detection.alertLevel?.toUpperCase() || 'ALERT';
  const timestamp = new Date().toLocaleString();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #1a1a2e; color: #fff; }
        .container { max-width: 600px; margin: 0 auto; background: #16213e; border-radius: 10px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #ff5722, #ff9800); padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 20px; }
        .alert-box { background: rgba(255, 87, 34, 0.2); border: 2px solid #ff5722; border-radius: 8px; padding: 15px; margin: 15px 0; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; }
        .stat { text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #ff5722; }
        .stat-label { font-size: 12px; color: #888; }
        .footer { background: #0d0d1a; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        .btn { display: inline-block; background: #ff5722; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔥 FIRE DETECTED!</h1>
        </div>
        <div class="content">
          <div class="alert-box">
            <strong>Alert Level: ${alertLevel}</strong><br>
            Fire has been detected by the surveillance system.
          </div>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-value">${confidence}%</div>
              <div class="stat-label">Confidence</div>
            </div>
            <div class="stat">
              <div class="stat-value">${cameraId}</div>
              <div class="stat-label">Camera</div>
            </div>
            <div class="stat">
              <div class="stat-value">${detection.detections?.length || 1}</div>
              <div class="stat-label">Detections</div>
            </div>
          </div>
          
          <p><strong>Time:</strong> ${timestamp}</p>
          <p><strong>Source:</strong> ${detection.source || 'Live Camera'}</p>
          
          ${imageUrl ? `<p><strong>Snapshot:</strong> <a href="${imageUrl}" style="color: #ff9800;">View Image</a></p>` : ''}
          
          <p style="color: #ff9800; font-weight: bold;">
            ⚠️ Please verify and take immediate action if necessary.
          </p>
          
          <center>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/detection" class="btn">
              View Dashboard
            </a>
          </center>
        </div>
        <div class="footer">
          Fire Surveillance System | Automated Alert<br>
          Do not reply to this email.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"🔥 Fire Alert System" <${emailConfig.auth.user}>`,
      to: to,
      subject: `🚨 FIRE ALERT - ${alertLevel} - ${timestamp}`,
      html: htmlContent
    });

    console.log('✅ Fire alert email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send test email
 */
const sendTestEmail = async (to) => {
  if (!transporter) {
    return { success: false, error: 'Email not configured' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Fire Surveillance System" <${emailConfig.auth.user}>`,
      to: to,
      subject: '✅ Test Email - Fire Surveillance System',
      html: `
        <div style="font-family: Arial; padding: 20px; background: #1a1a2e; color: #fff;">
          <h2 style="color: #4caf50;">✅ Email Configuration Successful!</h2>
          <p>Your email alerts are properly configured.</p>
          <p>You will receive alerts when fire is detected.</p>
          <hr style="border-color: #333;">
          <small style="color: #888;">Fire Surveillance System</small>
        </div>
      `
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Verify email configuration
 */
const verifyEmailConfig = async () => {
  if (!transporter) {
    return { configured: false, error: 'Email credentials not set' };
  }

  try {
    await transporter.verify();
    return { configured: true, email: emailConfig.auth.user };
  } catch (error) {
    return { configured: false, error: error.message };
  }
};

module.exports = {
  sendFireAlert,
  sendTestEmail,
  verifyEmailConfig,
  initializeTransporter
};
