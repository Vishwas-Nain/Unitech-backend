const express = require('express');
const ProductPostgres = require('../models/ProductPostgres');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products with optional filters
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      category,
      brand,
      minPrice,
      maxPrice,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Get all products using PostgreSQL
    const products = await ProductPostgres.findAll({
      category,
      brand,
      minPrice: minPrice ? parseFloat(minPrice) : null,
      maxPrice: maxPrice ? parseFloat(maxPrice) : null,
      search,
      sortBy,
      sortOrder,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // Add wishlist status if user is logged in
    let productsWithWishlist = products;
    if (req.user && req.user.wishlist) {
      const userWishlist = req.user.wishlist.map(item => item.product.toString());
      productsWithWishlist = products.map(product => ({
        ...product,
        isInWishlist: userWishlist.includes(product.id.toString())
      }));
    }

    res.json({
      products: productsWithWishlist,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(products.length / parseInt(limit)),
        totalProducts: products.length,
        hasNextPage: parseInt(page) < Math.ceil(products.length / parseInt(limit)),
        hasPrevPage: parseInt(page) > 1
      },
      filters: {
        category,
        brand,
        minPrice,
        maxPrice,
        search,
        sortBy,
        sortOrder
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// @route   GET /api/products/featured
// @desc    Get featured products
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const products = await Product.getFeatured(limit);

    res.json({ products });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({ message: 'Failed to fetch featured products' });
  }
});

// @route   GET /api/products/categories
// @desc    Get all product categories with counts
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          avgPrice: { $round: ['$avgPrice', 0] },
          _id: 0
        }
      },
      { $sort: { category: 1 } }
    ]);

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// @route   GET /api/products/brands
// @desc    Get all product brands with counts
// @access  Public
router.get('/brands', async (req, res) => {
  try {
    const brands = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$brand',
          count: { $sum: 1 },
          products: { $push: { name: '$name', price: '$price' } }
        }
      },
      {
        $project: {
          brand: '$_id',
          count: 1,
          _id: 0
        }
      },
      { $sort: { brand: 1 } }
    ]);

    res.json({ brands });
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({ message: 'Failed to fetch brands' });
  }
});

// @route   GET /api/products/search
// @desc    Search products
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const products = await Product.search(query, parseInt(limit));

    res.json({ products, query });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await ProductPostgres.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!product.is_active) {
      return res.status(404).json({ message: 'Product not available' });
    }

    // Check if product is in user's wishlist
    let isInWishlist = false;
    if (req.user && req.user.wishlist) {
      isInWishlist = req.user.wishlist.some(item =>
        item.product.toString() === product.id.toString()
      );
    }

    res.json({
      product: {
        ...product,
        isInWishlist
      }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Failed to fetch product' });
  }
});

// @route   POST /api/products
// @desc    Create new product (Admin only)
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const productData = req.body;
    const product = await ProductPostgres.create(productData);

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Failed to create product' });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product (Admin only)
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Product SKU already exists' });
    }
    res.status(500).json({ message: 'Failed to update product' });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

module.exports = router;
