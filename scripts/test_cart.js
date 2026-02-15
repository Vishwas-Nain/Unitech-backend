const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Product = require('../models/Product');
const Cart = require('../models/Cart');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/unitech', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log('Connected to MongoDB for test');

  // Find or create a test user
  let user = await User.findOne({ email: 'testcart@example.com' });
  if (!user) {
    user = new User({
      name: 'Test Cart User',
      email: 'testcart@example.com',
      mobile: '9876543210',
      password: 'password123',
      isVerified: true
    });
    await user.save();
    console.log('Created test user:', user._id.toString());
  } else {
    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }
    console.log('Found test user:', user._id.toString());
  }

  // Find a product to add
  const product = await Product.findOne();
  if (!product) {
    console.error('No product found in DB. Please ensure products exist.');
    process.exit(1);
  }

  console.log('Using product:', product._id.toString(), product.name || product.title || product._id);

  // Add item to cart using model method
  const cart = await Cart.addItem(user._id, product._id, 1);

  console.log('Cart after add:', JSON.stringify(cart, null, 2));

  // Fetch from DB to verify
  const fresh = await Cart.findOne({ user: user._id }).populate('items.product');
  console.log('Fetched cart from DB:', JSON.stringify(fresh, null, 2));

  await mongoose.disconnect();
  console.log('Done');
}

main().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
