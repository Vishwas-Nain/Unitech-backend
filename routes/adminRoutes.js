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
    const UserPostgres = require('../models/UserPostgres');
    const ProductPostgres = require('../models/ProductPostgres');
    
    const totalUsers = await UserPostgres.countUsers();
    const totalProducts = await ProductPostgres.countProducts();
    
    // For now, return basic stats with orders as 0
    // TODO: Implement PostgreSQL model for Order
    const totalOrders = 0;
    const totalRevenue = 0;
    const recentOrders = [];

    console.log('Dashboard stats:', { totalUsers, totalProducts, totalOrders, totalRevenue });

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
      message: 'Failed to fetch dashboard data',
      error: error.message 
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

    console.log('Fetching users with skip:', skip, 'limit:', limit);

    // Use PostgreSQL UserPostgres model instead of MongoDB User
    const UserPostgres = require('../models/UserPostgres');
    const users = await UserPostgres.findAllUsers(skip, limit);
    const total = await UserPostgres.countUsers();

    console.log('Found users:', users.length, 'Total count:', total);
    console.log('Sample user data:', users[0]);

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
      message: 'Failed to fetch users',
      error: error.message 
    });
  }
});

// @route   POST /api/admin/users
// @desc    Create a new user
// @access  Private (Admin only)
router.post('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, email, mobile, password, role } = req.body;
    const UserPostgres = require('../models/UserPostgres');
    const bcrypt = require('bcryptjs');

    // Check if user already exists
    const existingUser = await UserPostgres.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await UserPostgres.createUser({
      name,
      email,
      mobile,
      password: hashedPassword,
      role: role || 'user',
      is_verified: true
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user (including role change)
// @access  Private (Admin only)
router.put('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobile, role, is_verified } = req.body;
    const UserPostgres = require('../models/UserPostgres');

    // Check if user exists
    const existingUser = await UserPostgres.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If email is being changed, check if it's already taken
    if (email !== existingUser.email) {
      const emailExists = await UserPostgres.findByEmail(email);
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Update user
    const updatedUser = await UserPostgres.updateUser(id, {
      name,
      email,
      mobile,
      role,
      is_verified
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const UserPostgres = require('../models/UserPostgres');

    // Check if user exists
    const existingUser = await UserPostgres.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow deleting admin users
    if (existingUser.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }

    // Delete user
    await UserPostgres.deleteUser(id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// @route   PUT /api/admin/users/:id/toggle-status
// @desc    Block/unblock user
// @access  Private (Admin only)
router.put('/users/:id/toggle-status', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const UserPostgres = require('../models/UserPostgres');

    // Check if user exists
    const existingUser = await UserPostgres.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Toggle verification status (using as active/inactive flag)
    const newStatus = !existingUser.is_verified;
    const updatedUser = await UserPostgres.updateUser(id, {
      is_verified: newStatus
    });

    res.json({
      success: true,
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
      user: updatedUser
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle user status'
    });
  }
});

// @route   GET /api/admin/orders
// @desc    Get all orders (admin only)
// @access  Private (Admin only)
router.get('/orders', protect, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const OrderPostgres = require('../models/OrderPostgres');
    const orders = await OrderPostgres.getAllOrders(
      parseInt(limit),
      (parseInt(page) - 1) * parseInt(limit)
    );

    const totalOrders = await OrderPostgres.countOrders();
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    console.log('Admin orders request: page=', page, 'limit=', limit, 'returned=', orders.length, 'total=', totalOrders);

    res.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total: totalOrders,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Admin orders error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch orders',
      error: error.message 
    });
  }
});

// @route   GET /api/admin/products
// @desc    Get all products
// @access  Private (Admin only)
router.get('/products', protect, authorize('admin'), async (req, res) => {
  try {
    const ProductPostgres = require('../models/ProductPostgres');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000; 
    const skip = (page - 1) * limit;

    const products = await ProductPostgres.findAll({
      limit,
      offset: skip
    });
    const total = await ProductPostgres.countProducts();

    console.log(`Admin products request: page=${page}, limit=${limit}, returned=${products.length}, total=${total}`);

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
      message: 'Failed to fetch products',
      error: error.message 
    });
  }
});

// @route   POST /api/admin/products
// @desc    Create a new product
// @access  Private (Admin only)
router.post('/products', protect, authorize('admin'), async (req, res) => {
  try {
    const ProductPostgres = require('../models/ProductPostgres');
    const { name, price, category, brand, stock, description } = req.body;

    console.log('Creating product:', { name, price, category, brand, stock, description });

    const product = await ProductPostgres.create({
      name,
      price,
      category,
      brand,
      stock: stock || 0,
      description
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create product',
      error: error.message 
    });
  }
});

// @route   PUT /api/admin/products/:id
// @desc    Update a product
// @access  Private (Admin only)
router.put('/products/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const ProductPostgres = require('../models/ProductPostgres');
    const { name, price, category, brand, stock, description } = req.body;

    const product = await ProductPostgres.update(req.params.id, {
      name,
      price,
      category,
      brand,
      stock,
      description
    });

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
      message: 'Failed to update product',
      error: error.message 
    });
  }
});

// @route   DELETE /api/admin/products/:id
// @desc    Delete a product
// @access  Private (Admin only)
router.delete('/products/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const ProductPostgres = require('../models/ProductPostgres');

    const product = await ProductPostgres.deleteProduct(req.params.id);

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
      message: 'Failed to delete product',
      error: error.message 
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
