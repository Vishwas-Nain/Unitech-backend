const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

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

// @route   POST /api/admin/create
// @desc    Create admin account (requires secret key)
// @access  Public (with secret key)
router.post('/create',
  [
    body('name', 'Name is required').not().isEmpty().trim(),
    body('email', 'Please include a valid email').isEmail(),
    body('mobile')
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Please provide a valid 10-digit mobile number'),
    body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    body('secretKey', 'Secret key is required').not().isEmpty()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, email, mobile, password, secretKey } = req.body;

      // Verify secret key
      if (secretKey !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ 
          success: false,
          message: 'Invalid secret key' 
        });
      }

      // Check if admin already exists
      const existingAdmin = await User.findOne({ email });
      if (existingAdmin) {
        return res.status(400).json({ 
          success: false,
          message: 'Admin with this email already exists' 
        });
      }

      // Create admin user
      const admin = new User({
        name,
        email,
        mobile,
        password,
        role: 'admin',
        isVerified: true // Auto-verify admin accounts
      });

      await admin.save();

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: admin._id, 
          role: admin.role 
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '30d' }
      );

      res.status(201).json({
        success: true,
        message: 'Admin account created successfully',
        token,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          mobile: admin.mobile,
          role: admin.role,
          isVerified: admin.isVerified
        }
      });
    } catch (error) {
      console.error('Create admin error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to create admin account' 
      });
    }
  }
);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard stats
// @access  Private (Admin only)
router.get('/dashboard', protect, authorize('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalOrders = await require('../models/Order').countDocuments();
    const totalProducts = await require('../models/Product').countDocuments();
    
    // Get recent orders
    const recentOrders = await require('../models/Order')
      .find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalOrders,
        totalProducts
      },
      recentOrders
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch dashboard data' 
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private (Admin only)
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find({ role: 'user' })
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({ role: 'user' });

    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch users' 
    });
  }
});

module.exports = router;
