const SibApiV3Sdk = require('sib-api-v3-sdk');

class BrevoEmailService {
  constructor() {
    // Initialize Brevo client
    this.client = SibApiV3Sdk.ApiClient.instance;
    this.apiKey = this.client.authentications['api-key'];
    this.apiKey.apiKey = process.env.BREVO_API_KEY;
    
    if (!this.apiKey.apiKey) {
      console.log('⚠️ BREVO_API_KEY not found in environment variables');
    } else {
      console.log('✅ Brevo email service initialized');
    }
  }

  async sendOTP(email, otp, purpose = 'verification') {
    if (!this.apiKey.apiKey) {
      throw new Error('Brevo API key not configured');
    }

    try {
      const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      
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

      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.to = [{ email: email }];
      sendSmtpEmail.sender = { 
        email: process.env.EMAIL_SENDER || 'noreply@unitech.com', 
        name: 'UniTech' 
      };
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = htmlContent;

      const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
      
      console.log(`✅ OTP email sent to ${email} via Brevo`);
      return {
        success: true,
        messageId: result.messageId,
        message: 'OTP sent successfully via Brevo'
      };

    } catch (error) {
      console.error('❌ Brevo email error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send OTP via Brevo'
      };
    }
  }

  async sendWelcomeEmail(email, name) {
    if (!this.apiKey.apiKey) {
      throw new Error('Brevo API key not configured');
    }

    try {
      const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Welcome to UniTech, ${name}! 🎉</h2>
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
      `;

      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.to = [{ email: email }];
      sendSmtpEmail.sender = { 
        email: process.env.EMAIL_SENDER || 'noreply@unitech.com', 
        name: 'UniTech' 
      };
      sendSmtpEmail.subject = 'Welcome to UniTech! 🎉';
      sendSmtpEmail.htmlContent = htmlContent;

      const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
      
      console.log(`✅ Welcome email sent to ${email} via Brevo`);
      return {
        success: true,
        messageId: result.messageId,
        message: 'Welcome email sent successfully via Brevo'
      };

    } catch (error) {
      console.error('❌ Welcome email error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send welcome email via Brevo'
      };
    }
  }

  async sendNewsletter(newsletterData) {
    if (!this.apiKey.apiKey) {
      throw new Error('Brevo API key not configured');
    }

    try {
      const { subscribers, subject, content } = newsletterData;
      const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.sender = { 
        email: process.env.EMAIL_SENDER || 'noreply@unitech.com', 
        name: 'UniTech' 
      };
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = content;
      
      // Convert subscribers to Brevo format
      sendSmtpEmail.to = subscribers.map(subscriber => ({
        email: typeof subscriber === 'string' ? subscriber : subscriber.email
      }));

      const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
      
      console.log(`✅ Newsletter sent to ${subscribers.length} subscribers via Brevo`);
      return {
        success: true,
        messageId: result.messageId,
        recipients: subscribers.length,
        message: 'Newsletter sent successfully via Brevo'
      };

    } catch (error) {
      console.error('❌ Newsletter error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send newsletter via Brevo'
      };
    }
  }

  async sendOrderConfirmation(order, user) {
    if (!this.apiKey.apiKey) {
      throw new Error('Brevo API key not configured');
    }

    try {
      const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Order Confirmed! 🎉</h2>
          <p>Hi ${user.name},</p>
          <p>Thank you for your order! We've received your order and are preparing it for shipment.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Order Details</h3>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            <p><strong>Total Amount:</strong> ₹${order.total}</p>
            <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/orders/${order._id}" 
               style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Order Details
            </a>
          </div>
          
          <p style="color: #666;">We'll send you another email once your order ships. If you have any questions about your order, please contact our customer support.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The UniTech Team
          </p>
        </div>
      `;

      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.to = [{ email: user.email }];
      sendSmtpEmail.sender = { 
        email: process.env.EMAIL_SENDER || 'noreply@unitech.com', 
        name: 'UniTech' 
      };
      sendSmtpEmail.subject = `Order Confirmation - ${order.orderNumber}`;
      sendSmtpEmail.htmlContent = htmlContent;

      const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
      
      console.log(`✅ Order confirmation sent to ${user.email} via Brevo`);
      return {
        success: true,
        messageId: result.messageId,
        message: 'Order confirmation sent successfully via Brevo'
      };

    } catch (error) {
      console.error('❌ Order confirmation error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send order confirmation via Brevo'
      };
    }
  }
}

module.exports = new BrevoEmailService();
