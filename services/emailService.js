const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // ✅ Correct Gmail transporter (works on Render)
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // ✅ Verify SMTP connection
    this.transporter.verify((err, success) => {
      if (err) {
        console.log("❌ SMTP ERROR:", err);
      } else {
        console.log("✅ SMTP READY - Email service working");
      }
    });
  }

  // Send email verification
  async sendEmailVerification(user, verificationUrl) {
    const mailOptions = {
      from: `"Unitech Computers" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Verify Your Email - Unitech Computers',
      html: `
        <h2>Hi ${user.name},</h2>
        <p>Please verify your email by clicking below:</p>
        <a href="${verificationUrl}" style="padding:10px 20px;background:#667eea;color:white;text-decoration:none;border-radius:5px;">
          Verify Email
        </a>
        <p>This link expires in 10 minutes.</p>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email verification sent to ${user.email}`);
    } catch (error) {
      console.error('❌ Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  // Send password reset email
  async sendPasswordReset(user, resetUrl) {
    const mailOptions = {
      from: `"Unitech Computers" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h2>Hi ${user.name},</h2>
        <p>Click below to reset your password:</p>
        <a href="${resetUrl}" style="padding:10px 20px;background:#667eea;color:white;text-decoration:none;border-radius:5px;">
          Reset Password
        </a>
        <p>This link expires in 10 minutes.</p>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${user.email}`);
    } catch (error) {
      console.error('❌ Error sending reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  // Send newsletter email
  async sendNewsletter(newsletterData) {
    const { subscribers, subject, content } = newsletterData;

    const mailOptions = {
      from: `"Unitech Computers" <${process.env.EMAIL_USER}>`,
      bcc: subscribers.map(sub => sub.email),
      subject,
      html: content
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Newsletter sent to ${subscribers.length} users`);
      return { success: true };
    } catch (error) {
      console.error('❌ Newsletter error:', error);
      throw new Error('Failed to send newsletter');
    }
  }

  // Send order confirmation email
  async sendOrderConfirmation(order, user) {
    const mailOptions = {
      from: `"Unitech Computers" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `Order Confirmation - ${order.orderNumber}`,
      html: `
        <h2>Hi ${user.name},</h2>
        <p>Your order <b>${order.orderNumber}</b> is confirmed.</p>
        <p>Total: ₹${order.total}</p>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Order confirmation sent to ${user.email}`);
    } catch (error) {
      console.error('❌ Order email error:', error);
      throw new Error('Failed to send order email');
    }
  }
}

module.exports = new EmailService();
