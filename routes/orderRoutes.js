const express = require('express');
const { body, validationResult } = require('express-validator');
const OrderPostgres = require('../models/OrderPostgres');
const CartPostgres = require('../models/CartPostgres');
const ProductPostgres = require('../models/ProductPostgres');
const UserPostgres = require('../models/UserPostgres');
const { protect } = require('../middleware/auth');
const brevoEmailService = require('../utils/brevoEmailService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({ field: err.param, message: err.msg }))
    });
  }
  next();
};

// @route   GET /api/orders
// @desc    Get user's orders
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const orders = await OrderPostgres.getUserOrders(
      req.user.id,
      parseInt(limit),
      (parseInt(page) - 1) * parseInt(limit)
    );

    const totalOrders = await OrderPostgres.countOrders(req.user.id);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    res.json({
      success: true,
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalOrders,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch user orders' 
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await OrderPostgres.getOrderById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // Check if user owns this order or is admin
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch order' 
    });
  }
});

// @route   POST /api/orders
// @desc    Create new order from cart
// @access  Private
router.post('/',
  protect,
  [
    body('shippingAddress')
      .isObject()
      .withMessage('Shipping address is required'),

    body('shippingAddress.street')
      .trim()
      .notEmpty()
      .withMessage('Street address is required'),

    body('shippingAddress.city')
      .trim()
      .notEmpty()
      .withMessage('City is required'),

    body('shippingAddress.state')
      .trim()
      .notEmpty()
      .withMessage('State is required'),

    body('shippingAddress.pincode')
      .matches(/^\d{6}$/)
      .withMessage('Pincode must be 6 digits'),

    body('paymentMethod')
      .isIn(['card', 'upi', 'netbanking', 'cod', 'wallet'])
      .withMessage('Invalid payment method'),

    body('billingAddress')
      .optional()
      .isObject()
      .withMessage('Billing address must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      console.log('🛒 Create order request:', {
        user: req.user ? { id: req.user.id, email: req.user.email } : null,
        body: req.body
      });

      const {
        shippingAddress,
        billingAddress,
        paymentMethod,
        couponCode,
        notes
      } = req.body;

      // Get user's cart
      const cart = await CartPostgres.getUserCart(req.user.id);
      console.log('🛒 User cart:', {
        userId: req.user.id,
        hasCart: !!cart,
        itemsCount: cart ? cart.items.length : 0,
        totalItems: cart ? cart.totalItems : 0,
        totalPrice: cart ? cart.totalPrice : 0
      });

      if (!cart || cart.items.length === 0) {
        console.log('❌ Cart is empty');
        return res.status(400).json({ 
          success: false,
          message: 'Cart is empty' 
        });
      }

      // Check product availability and stock
      for (const item of cart.items) {
        const product = await ProductPostgres.findById(item.product_id);
        if (!product) {
          return res.status(400).json({
            success: false,
            message: `${item.name} is no longer available`
          });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `${item.name} only has ${product.stock} items in stock`
          });
        }
      }

      // Calculate totals
      const subtotal = cart.totalPrice;
      const discount = 0; // TODO: Implement coupon logic
      const tax = subtotal * 0.18; // 18% GST
      const shipping = subtotal > 1000 ? 0 : 100; // Free shipping over ₹1000
      const total = subtotal - discount + tax + shipping;

      // Create order items
      const orderItems = cart.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price
      }));

      // Create order
      const order = await OrderPostgres.create(req.user.id, {
        items: orderItems,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        paymentMethod,
        totalAmount: total
      });

      // Update product stock
      for (const item of orderItems) {
        await ProductPostgres.updateStock(item.product_id, -item.quantity);
      }

      // Clear user's cart
      await CartPostgres.clearCart(req.user.id);

      // Send order confirmation email
      try {
        const user = await UserPostgres.findById(req.user.id);
        await brevoEmailService.sendOrderConfirmation(user.email, order);
      } catch (emailError) {
        console.error('Failed to send order confirmation email:', emailError);
      }

      res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        order
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to place order' 
      });
    }
  }
);

// @route   PUT /api/orders/:id/status
// @desc    Update order status (admin only)
// @access  Private (Admin only)
router.put('/:id/status', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    const { status } = req.body;
    
    if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    const updatedOrder = await OrderPostgres.updateOrderStatus(req.params.id, status);
    
    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update order status' 
    });
  }
});

// @route   GET /api/orders/all
// @desc    Get all orders (admin only)
// @access  Private (Admin only)
router.get('/all', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    const { page = 1, limit = 10 } = req.query;

    const orders = await OrderPostgres.getAllOrders(
      parseInt(limit),
      (parseInt(page) - 1) * parseInt(limit)
    );

    const totalOrders = await OrderPostgres.countOrders();
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    res.json({
      success: true,
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalOrders,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch all orders' 
    });
  }
});

module.exports = router;
