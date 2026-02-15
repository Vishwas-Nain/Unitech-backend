require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const API_BASE = process.env.API_BASE || 'http://localhost:5000';

async function request(path, opts = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, opts);
  const txt = await res.text();
  try { return { status: res.status, data: JSON.parse(txt) }; } catch { return { status: res.status, data: txt }; }
}

async function findProductFromDb() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/unitech');
  const product = await Product.findOne({ isActive: true, stock: { $gte: 1 } });
  await mongoose.disconnect();
  return product;
}

async function main() {
  try {
    console.log('Looking for an active product in DB...');
    const product = await findProductFromDb();
    if (!product) {
      console.error('No active product with stock found in DB.');
      process.exit(1);
    }

    console.log('Using product:', product._id.toString(), product.name || product.title || '');

    // Login as test user
    const loginRes = await fetch(`${API_BASE}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testcart@example.com', password: 'password123' })
    });

    const loginBody = await loginRes.json();
    if (!loginRes.ok) {
      console.error('Login failed:', loginBody);
      process.exit(1);
    }

    const token = loginBody.token;
    console.log('Logged in, token length:', token ? token.length : 0);

    // Add item to cart
    const addRes = await fetch(`${API_BASE}/api/cart/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ productId: product._id || product.id, quantity: 1 })
    });

    const addBody = await addRes.json();
    console.log('Add to cart response:', addBody.message || addBody);

    // Fetch cart
    const cartRes = await fetch(`${API_BASE}/api/cart`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const cartBody = await cartRes.json();
    console.log('Cart fetched:', JSON.stringify(cartBody.cart, null, 2));

  } catch (err) {
    console.error('API test error:', err);
    process.exit(1);
  }
}

main();
