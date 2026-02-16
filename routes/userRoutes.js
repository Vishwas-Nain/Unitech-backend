const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const UserPostgres = require('../models/UserPostgres');
const { protect } = require('../middleware/auth');
const { sendOtpViaSms } = require('../utils/smsService');
const { sendOtpViaEmail, sendWelcomeEmail } = require('../utils/emailService');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Token expires in 30 days
  });
};

const router = express.Router();

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(err => ({ field: err.param, message: err.msg }))
    });
  }
  next();
};

// @route   POST /api/users/register
// @desc    Register a new user
// @access  Public
router.post('/register',
  [
    body('name', 'Name is required').not().isEmpty().trim(),
    body('email', 'Please include a valid email').isEmail(),
    body('mobile')
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Please provide a valid 10-digit mobile number'),
    body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, email, password, mobile } = req.body;

      // Check if user exists
      const existingUser = await UserPostgres.findByEmailOrMobile(email, mobile);
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email or mobile already exists' });
      }

      // Create user
      const user = await UserPostgres.create({
        name,
        email,
        mobile,
        password,
        isVerified: false
      });

      // Generate and save email OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await UserPostgres.createEmailOTP(user.id, otp);

      // Send OTP via email
      const emailResult = await sendOtpViaEmail(email, otp, 'registration');
      if (!emailResult.success) {
        console.error('Failed to send OTP:', emailResult.error);
        // In development, continue without email
        if (process.env.NODE_ENV === 'development') {
          console.log(`Development mode - OTP for ${email}: ${otp}`);
        } else {
          return res.status(500).json({ 
            success: false,
            message: 'Failed to send OTP. Please try again.'
          });
        }
      }

      res.status(201).json({
        success: true,
        message: 'Registration successful! Please verify your email with OTP sent to your email address.',
        userId: user.id,
        email: user.email // Return email for verification
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed. Please try again.' });
    }
  }
);
// @route   POST /api/users/login
// @desc    Login user with OTP verification
// @access  Public
router.post('/login',
  [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password is required').exists(),
    body('otp', 'OTP is required for verification').optional().isLength({ min: 6, max: 6 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password, otp } = req.body;

      // Check if user exists
      const user = await UserPostgres.findByEmail(email);
      if (!user) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid credentials' 
        });
      }

      // Check password
      const isMatch = await UserPostgres.comparePassword(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid credentials' 
        });
      }

      // If OTP is provided, verify it
      if (otp) {
        const verifiedUser = await UserPostgres.verifyEmailOTP(user.id, otp);
        if (!verifiedUser) {
          await UserPostgres.incrementOTPAttempts(user.id);
          return res.status(400).json({
            success: false,
            message: 'Invalid OTP or expired. Please try again.'
          });
        }
        
        // Generate JWT token
        const token = generateToken(verifiedUser.id);

        res.json({
          success: true,
          message: 'Login successful',
          token,
          user: {
            id: verifiedUser.id,
            name: verifiedUser.name,
            email: verifiedUser.email,
            mobile: verifiedUser.mobile,
            role: verifiedUser.role,
            isVerified: verifiedUser.is_verified
          }
        });
      } else if (!user.is_verified) {
        // If no OTP provided and user is not verified, send new OTP
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        await UserPostgres.createEmailOTP(user.id, newOtp);
        
        // Log OTP in development
        if (process.env.NODE_ENV !== 'production') {
          console.log(`OTP for ${user.email}: ${newOtp}`);
        }
        
        // Send OTP via email
        const emailResult = await sendOtpViaEmail(user.email, newOtp, 'login');
        
        if (!emailResult.success) {
          console.error('Failed to send OTP:', emailResult.error);
          return res.status(500).json({ 
            success: false,
            message: 'Failed to send OTP. Please try again.'
          });
        }
        
        return res.status(200).json({
          success: true,
          requiresOtp: true,
          message: 'Please enter the OTP sent to your email address',
          email: user.email,
          userId: user.id
        });
      } else {
        // User is verified, login directly
        const token = generateToken(user.id);

        res.json({
          success: true,
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            role: user.role,
            isVerified: user.is_verified
          }
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed. Please try again.' });
    }
  }
);

// @route   POST /api/users/verify-email
// @desc    Verify user email
// @access  Public
router.post('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    res.json({ message: 'Email verified successfully! You can now login.' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Email verification failed. Please try again.' });
  }
});
// @route   POST /api/users/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password',
  [
    body('mobile')
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Please provide a valid 10-digit mobile number')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { mobile } = req.body;

      const user = await User.findOne({ mobile });

      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found with this mobile number' 
        });
      }

      // Generate reset token
      const resetToken = user.createPasswordResetToken();
      await user.save();

      // Generate OTP for password reset
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.passwordResetToken = await bcrypt.hash(resetToken, 10);
      user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
      await user.save();

      // Send OTP via SMS
      const smsResult = await sendOtpViaSms(mobile, `Your password reset OTP is: ${otp}`);
      
      if (!smsResult.success) {
        console.error('Failed to send OTP:', smsResult.error);
        return res.status(500).json({ 
          success: false,
          message: 'Failed to send OTP. Please try again.'
        });
      }

      res.json({
        success: true,
        message: 'Password reset OTP sent to your mobile number',
        resetToken
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to process your request. Please try again.'
      });
    }
  }
);

// @route   POST /api/users/reset-password
// @desc    Reset password
// @access  Public
router.post('/reset-password/:token',
  [
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      const user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: Date.now() }
      }).select('+password');

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      // Update password
      user.password = password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;

      await user.save();

      res.json({ message: 'Password reset successfully! You can now login with your new password.' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Failed to reset password. Please try again.' });
    }
  }
);

// @route   POST /api/users/send-email-otp
// @desc    Send OTP for email verification
// @access  Public
router.post('/send-email-otp',
  [
    body('email', 'Please include a valid email').isEmail()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email } = req.body;

      // Find user by email
      let user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found with this email address' 
        });
      }

      // Check if OTP was sent recently (rate limiting)
      const cooldownPeriod = 2 * 60 * 1000; // 2 minutes
      if (user.lastOtpSent && (Date.now() - user.lastOtpSent) < cooldownPeriod) {
        const remainingTime = Math.ceil((cooldownPeriod - (Date.now() - user.lastOtpSent)) / 1000);
        return res.status(429).json({
          message: `Please wait ${remainingTime} seconds before requesting another OTP`
        });
      }

      // Check OTP attempts
      if (user.otpAttempts >= 5) {
        return res.status(429).json({
          message: 'Too many OTP attempts. Please try again later.'
        });
      }

      // Generate and save email OTP
      const otp = user.createEmailOTP();
      user.lastOtpSent = new Date();

      await user.save();

      // Send OTP via email
      const emailResult = await sendOtpViaEmail(email, otp, 'login');
      
      if (!emailResult.success) {
        console.error('Failed to send OTP:', emailResult.error);
        return res.status(500).json({ 
          success: false,
          message: 'Failed to send OTP. Please try again.'
        });
      }

      res.json({
        success: true,
        message: 'OTP sent successfully to your email address',
        email: email
      });
    } catch (error) {
      console.error('Send email OTP error:', error);
      res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }
  }
);

// @route   POST /api/users/verify-email-otp
// @desc    Verify OTP for email verification
// @access  Public
router.post('/verify-email-otp',
  [
    body('email', 'Please include a valid email').isEmail(),
    body('otp')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
      .isNumeric()
      .withMessage('OTP must contain only numbers')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, otp, userId } = req.body;

      // Find user by ID if provided, otherwise by email
      let user;
      if (userId) {
        user = await UserPostgres.findById(userId);
      } else {
        user = await UserPostgres.findByEmail(email);
      }

      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }

      // Check if OTP is valid
      const verifiedUser = await UserPostgres.verifyEmailOTP(user.id, otp);
      if (!verifiedUser) {
        await UserPostgres.incrementOTPAttempts(user.id);
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP or expired. Please try again.'
        });
      }

      // Send welcome email if this is a new registration
      if (!user.last_otp_sent || (Date.now() - new Date(user.last_otp_sent).getTime()) < 10 * 60 * 1000) {
        await sendWelcomeEmail(user.email, user.name);
      }

      // Generate JWT token
      const token = generateToken(verifiedUser.id);

      res.json({
        success: true,
        message: 'Email verified successfully',
        token,
        user: {
          id: verifiedUser.id,
          name: verifiedUser.name,
          email: verifiedUser.email,
          mobile: verifiedUser.mobile,
          role: verifiedUser.role,
          isVerified: verifiedUser.is_verified
        }
      });
    } catch (error) {
      console.error('Verify email OTP error:', error);
      res.status(500).json({ 
        success: false,
        message: 'OTP verification failed. Please try again.' 
      });
    }
  }
);

// @route   POST /api/users/send-otp
// @desc    Send OTP for mobile verification
// @access  Public
router.post('/send-otp',
  [
    body('mobile')
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Please provide a valid 10-digit mobile number')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { mobile } = req.body;

      // Find or create user
      let user = await User.findOne({ mobile });

      if (!user) {
        // Create temporary user for OTP verification
        user = new User({ mobile, name: 'Temp User' });
      }

      // Check if OTP was sent recently (rate limiting)
      const cooldownPeriod = 2 * 60 * 1000; // 2 minutes
      if (user.lastOtpSent && (Date.now() - user.lastOtpSent) < cooldownPeriod) {
        const remainingTime = Math.ceil((cooldownPeriod - (Date.now() - user.lastOtpSent)) / 1000);
        return res.status(429).json({
          message: `Please wait ${remainingTime} seconds before requesting another OTP`
        });
      }

      // Check OTP attempts
      if (user.otpAttempts >= 5) {
        return res.status(429).json({
          message: 'Too many OTP attempts. Please try again later.'
        });
      }

      // Generate and save OTP
      const otp = user.createMobileOTP();
      user.lastOtpSent = new Date();

      await user.save();

      // Here you would integrate with SMS service like Twilio
      // For now, we'll just log the OTP
      console.log(`OTP for ${mobile}: ${otp}`);

      // In production, use actual SMS service:
      // const smsResult = await smsService.sendOTP(mobile, otp);

      res.json({
        message: 'OTP sent successfully to your mobile number',
        otp: process.env.NODE_ENV === 'development' ? otp : undefined // Only show OTP in development
      });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }
  }
);

// @route   POST /api/users/verify-otp
// @desc    Verify OTP for mobile verification
// @access  Public
router.post('/verify-otp',
  [
    body('mobile')
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Please provide a valid 10-digit mobile number'),
    body('otp')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
      .isNumeric()
      .withMessage('OTP must contain only numbers')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { mobile, otp, userId } = req.body;

      // Find user by ID if provided, otherwise by mobile
      let user;
      if (userId) {
        user = await User.findById(userId);
      } else {
        user = await User.findOne({ mobile });
      }

      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }

      // Check if OTP is valid
      if (!user.isMobileOTPValid(otp)) {
        // Increment attempts
        await user.incrementOtpAttempts();

        const remainingAttempts = 5 - user.otpAttempts;
        if (remainingAttempts > 0) {
          return res.status(400).json({
            success: false,
            message: `Invalid OTP. ${remainingAttempts} attempts remaining.`
          });
        } else {
          return res.status(429).json({
            success: false,
            message: 'Too many failed attempts. Please request a new OTP.'
          });
        }
      }

      // OTP is valid, mark as verified
      user.isVerified = true;
      user.mobileVerificationCode = undefined;
      user.mobileVerificationExpires = undefined;
      user.otpAttempts = 0;

      await user.save();

      // Generate JWT token
      const token = generateToken(user._id);

      res.json({
        success: true,
        message: 'Mobile number verified successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          isVerified: user.isVerified
        }
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ 
        success: false,
        message: 'OTP verification failed. Please try again.' 
      });
    }
  }
);

// @route   POST /api/users/resend-otp
// @desc    Resend OTP to mobile
// @access  Public
router.post('/resend-otp',
  [
    body('mobile')
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Please provide a valid 10-digit mobile number')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { mobile } = req.body;
      const user = await User.findOne({ mobile });

      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }

      // Generate and save new OTP
      const otp = user.createMobileOTP();
      await user.save();
      
      // Send OTP via SMS
      const smsResult = await sendOtpViaSms(mobile, otp);
      if (!smsResult.success) {
        console.error('Failed to send OTP:', smsResult.error);
        return res.status(500).json({ 
          success: false,
          message: 'Failed to send OTP. Please try again.'
        });
      }

      res.json({
        success: true,
        message: 'New OTP sent to your mobile number',
        mobile: user.mobile
      });
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to resend OTP. Please try again.' 
      });
    }
  }
);

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        isVerified: user.isVerified,
        profileImage: user.profileImage,
        addresses: user.addresses,
        wishlist: user.wishlist
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),

    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, email } = req.body;

      const user = await User.findById(req.user._id);

      if (name) user.name = name;
      if (email) {
        // Check if email is already taken by another user
        const existingUser = await User.findOne({
          email: email.toLowerCase(),
          _id: { $ne: req.user._id }
        });

        if (existingUser) {
          return res.status(400).json({ message: 'Email is already registered' });
        }
        user.email = email.toLowerCase();
      }

      await user.save();

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          isVerified: user.isVerified
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  }
);

module.exports = router;
