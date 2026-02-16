const express = require('express');
const { body, validationResult } = require('express-validator');
const CartPostgres = require('../models/CartPostgres');
const { protect } = require('../middleware/auth');

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

// @route   GET /api/cart
// @desc    Get user's cart
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const cart = await CartPostgres.getUserCart(req.user.id);

    if (!cart) {
      return res.json({ cart: { items: [], totalItems: 0, totalPrice: 0 } });
    }

    res.json({ cart });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Failed to fetch cart' });
  }
});

// @route   POST /api/cart/items
// @desc    Add item to cart
// @access  Private
router.post('/items',
  protect,
  [
    body('productId')
      .isInt({ min: 1 })
      .withMessage('Invalid product ID'),

    body('quantity')
      .isInt({ min: 1, max: 10 })
      .withMessage('Quantity must be between 1 and 10')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { productId, quantity } = req.body;

      await CartPostgres.addToCart(req.user.id, parseInt(productId), parseInt(quantity));

      const cart = await CartPostgres.getUserCart(req.user.id);
      res.json({
        success: true,
        message: 'Item added to cart',
        cart
      });
    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to add item to cart'
      });
    }
  }
);

// @route   PUT /api/cart/items/:productId
// @desc    Update item quantity in cart
// @access  Private
router.put('/items/:productId',
  protect,
  [
    body('quantity')
      .isInt({ min: 0, max: 10 })
      .withMessage('Quantity must be between 0 and 10')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { productId } = req.params;
      const { quantity } = req.body;

      if (quantity === 0) {
        // Remove item if quantity is 0
        await CartPostgres.removeFromCart(req.user.id, productId);
        const cart = await CartPostgres.getUserCart(req.user.id);
        return res.json({
          message: 'Item removed from cart',
          cart
        });
      }

      await CartPostgres.updateCartItem(req.user.id, productId, quantity);
      const cart = await CartPostgres.getUserCart(req.user.id);

      res.json({
        message: 'Cart updated successfully',
        cart
      });
    } catch (error) {
      console.error('Update cart error:', error);
      if (error.message === 'Cart not found') {
        return res.status(404).json({ message: 'Cart not found' });
      }
      if (error.message === 'Product not found in cart') {
        return res.status(404).json({ message: 'Product not found in cart' });
      }
      res.status(500).json({ message: 'Failed to update cart' });
    }
  }
);

// @route   DELETE /api/cart/items/:productId
// @desc    Remove item from cart
// @access  Private
router.delete('/items/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params;

    await CartPostgres.removeFromCart(req.user.id, productId);
    const cart = await CartPostgres.getUserCart(req.user.id);

    res.json({
      message: 'Item removed from cart successfully',
      cart
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ message: 'Failed to remove item from cart' });
  }
});

// @route   DELETE /api/cart
// @desc    Clear entire cart
// @access  Private
router.delete('/', protect, async (req, res) => {
  try {
    await CartPostgres.clearCart(req.user.id);

    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Failed to clear cart' });
  }
});

// @route   POST /api/cart/coupon
// @desc    Apply coupon to cart
// @access  Private
router.post('/coupon',
  protect,
  [
    body('couponCode')
      .trim()
      .notEmpty()
      .withMessage('Coupon code is required'),

    body('discount')
      .isFloat({ min: 0, max: 100 })
      .withMessage('Discount must be between 0 and 100'),

    body('discountType')
      .isIn(['percentage', 'fixed'])
      .withMessage('Discount type must be percentage or fixed')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { couponCode, discount, discountType } = req.body;

      const cart = await Cart.applyCoupon(req.user._id, couponCode, discount, discountType);

      res.json({
        message: 'Coupon applied successfully',
        cart
      });
    } catch (error) {
      console.error('Apply coupon error:', error);
      if (error.message === 'Cart not found') {
        return res.status(404).json({ message: 'Cart not found' });
      }
      res.status(500).json({ message: 'Failed to apply coupon' });
    }
  }
);

// @route   DELETE /api/cart/coupon
// @desc    Remove coupon from cart
// @access  Private
router.delete('/coupon', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.coupon = null;
    await cart.save();

    res.json({
      message: 'Coupon removed successfully',
      cart
    });
  } catch (error) {
    console.error('Remove coupon error:', error);
    res.status(500).json({ message: 'Failed to remove coupon' });
  }
});

// Helper function to update cart with current product prices
async function updateCartPrices(cart) {
  for (let item of cart.items) {
    const product = await Product.findById(item.product);

    if (product && product.isActive) {
      item.price = product.price;
    } else if (product && !product.isActive) {
      // Remove unavailable products from cart
      cart.items = cart.items.filter(cartItem =>
        cartItem.product.toString() !== item.product.toString()
      );
    }
  }

  return cart.save();
}

module.exports = router;
