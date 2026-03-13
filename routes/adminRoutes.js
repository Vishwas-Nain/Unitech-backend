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
    const Order = require('../models/Order');
    const Product = require('../models/Product');
    
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments();
    
    // Calculate total revenue
    const orders = await Order.find({ status: { $in: ['delivered', 'shipped', 'processing'] } });
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    
    // Get recent orders
    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalOrders,
        totalProducts,
        totalRevenue
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

// @route   GET /api/admin/orders
// @desc    Get all orders
// @access  Private (Admin only)
router.get('/orders', protect, authorize('admin'), async (req, res) => {
  try {
    const Order = require('../models/Order');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments();

    res.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch orders' 
    });
  }
});

// @route   GET /api/admin/products
// @desc    Get all products
// @access  Private (Admin only)
router.get('/products', protect, authorize('admin'), async (req, res) => {
  try {
    const Product = require('../models/Product');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const products = await Product.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments();

    res.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch products' 
    });
  }
});

// @route   POST /api/admin/products
// @desc    Create a new product
// @access  Private (Admin only)
router.post('/products', protect, authorize('admin'), async (req, res) => {
  try {
    const Product = require('../models/Product');
    const { name, price, category, stock, description, images } = req.body;

    const product = new Product({
      name,
      price,
      category,
      stock: stock || 0,
      description,
      images: images || []
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create product' 
    });
  }
});

// @route   PUT /api/admin/products/:id
// @desc    Update a product
// @access  Private (Admin only)
router.put('/products/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const Product = require('../models/Product');
    const { name, price, category, stock, description, images } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, price, category, stock, description, images },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update product' 
    });
  }
});

// @route   DELETE /api/admin/products/:id
// @desc    Delete a product
// @access  Private (Admin only)
router.delete('/products/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const Product = require('../models/Product');
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete product' 
    });
  }
});

// @route   PUT /api/admin/orders/:id
// @desc    Update order status
// @access  Private (Admin only)
router.put('/orders/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const Order = require('../models/Order');
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update order status' 
    });
  }
});

module.exports = router;
