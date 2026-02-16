const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000, // 5 seconds
    socketTimeout: 10000, // 10 seconds
    pool: true, // Use connection pooling
    maxConnections: 1,
    maxMessages: 5,
  });
};

// Send OTP via email
const sendOtpViaEmail = async (email, otp, purpose = 'verification') => {
  try {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email credentials not configured in environment variables');
    }

    console.log(`📧 Attempting to send email to ${email} using ${process.env.EMAIL_USER}`);
    const transporter = createTransporter();

    let subject, htmlContent;

    switch (purpose) {
      case 'registration':
        subject = 'Verify Your Email - UniTech';
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to UniTech!</h2>
            <p>Thank you for registering. Please use the following OTP to verify your email address:</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h1 style="color: #007bff; font-size: 32px; letter-spacing: 3px; margin: 0;">${otp}</h1>
            </div>
            <p><strong>This OTP will expire in 5 minutes.</strong></p>
            <p>If you didn't request this OTP, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">
              Best regards,<br>
              The UniTech Team
            </p>
          </div>
        `;
        break;

      case 'login':
        subject = 'Login OTP - UniTech';
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Login Verification</h2>
            <p>Please use the following OTP to complete your login:</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h1 style="color: #28a745; font-size: 32px; letter-spacing: 3px; margin: 0;">${otp}</h1>
            </div>
            <p><strong>This OTP will expire in 5 minutes.</strong></p>
            <p>If you didn't try to login, please secure your account immediately.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">
              Best regards,<br>
              The UniTech Team
            </p>
          </div>
        `;
        break;

      case 'password_reset':
        subject = 'Password Reset OTP - UniTech';
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Reset Your Password</h2>
            <p>You requested to reset your password. Use the following OTP to proceed:</p>
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h1 style="color: #856404; font-size: 32px; letter-spacing: 3px; margin: 0;">${otp}</h1>
            </div>
            <p><strong>This OTP will expire in 10 minutes.</strong></p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">
              Best regards,<br>
              The UniTech Team
            </p>
          </div>
        `;
        break;

      default:
        subject = 'Verification OTP - UniTech';
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Verification Code</h2>
            <p>Your verification code is:</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h1 style="color: #007bff; font-size: 32px; letter-spacing: 3px; margin: 0;">${otp}</h1>
            </div>
            <p><strong>This OTP will expire in 5 minutes.</strong></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">
              Best regards,<br>
              The UniTech Team
            </p>
          </div>
        `;
    }

    const mailOptions = {
      from: `"UniTech" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: htmlContent,
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log(`Email sent to ${email}: ${result.messageId}`);
    
    return {
      success: true,
      messageId: result.messageId,
      message: 'OTP sent successfully via email'
    };

  } catch (error) {
    console.error('Email service error:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to send OTP via email'
    };
  }
};

// Send welcome email
const sendWelcomeEmail = async (email, name) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"UniTech" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to UniTech! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Welcome to UniTech, ${name}!</h2>
          <p>Thank you for joining our platform. Your account has been successfully created and verified.</p>
          <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #155724; margin-top: 0;">What's Next?</h3>
            <ul style="color: #155724;">
              <li>Explore our wide range of products</li>
              <li>Add items to your wishlist</li>
              <li>Enjoy secure and fast checkout</li>
              <li>Track your orders in real-time</li>
            </ul>
          </div>
          <p>If you have any questions, feel free to contact our support team.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The UniTech Team
          </p>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: result.messageId,
      message: 'Welcome email sent successfully'
    };

  } catch (error) {
    console.error('Welcome email error:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to send welcome email'
    };
  }
};

module.exports = {
  sendOtpViaEmail,
  sendWelcomeEmail
};
