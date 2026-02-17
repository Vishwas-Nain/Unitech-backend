require('dotenv').config();
const { Pool } = require('pg');

// Use production Neon database directly
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const sampleProducts = [
  {
    name: 'MacBook Air M2',
    description: '13-inch MacBook Air with M2 chip, 8GB RAM, 256GB SSD',
    price: 94999.00,
    category: 'Laptops',
    subcategory: 'MacBooks',
    brand: 'Apple',
    stock: 25,
    images: '["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500"]',
    is_active: true
  },
  {
    name: 'Wireless Mouse',
    description: 'Ergonomic wireless mouse with precision tracking',
    price: 2499.00,
    category: 'Accessories',
    subcategory: 'Mouse',
    brand: 'Logitech',
    stock: 150,
    images: '["https://images.unsplash.com/photo-1527864550449-7da72c6d8f48?w=500"]',
    is_active: true
  },
  {
    name: 'Mechanical Keyboard',
    description: 'RGB mechanical keyboard with blue switches',
    price: 4999.00,
    category: 'Accessories',
    subcategory: 'Keyboards',
    brand: 'Corsair',
    stock: 75,
    images: '["https://images.unsplash.com/photo-1598928506315-c3eda2e3a0f0?w=500"]',
    is_active: true
  },
  {
    name: 'Monitor 27" 4K',
    description: '27-inch 4K monitor with HDR support',
    price: 15999.00,
    category: 'Monitors',
    subcategory: '4K Monitors',
    brand: 'LG',
    stock: 40,
    images: '["https://images.unsplash.com/photo-15274433578-1a5a5a7d6D6D?w=500"]',
    is_active: true
  },
  {
    name: 'USB-C Hub',
    description: 'Multi-port USB-C hub with HDMI and USB 3.0',
    price: 1999.00,
    category: 'Accessories',
    subcategory: 'USB Hubs',
    brand: 'Anker',
    stock: 200,
    images: '["https://images.unsplash.com/photo-1527864550449-7da72c6d8f48?w=500"]',
    is_active: true
  },
  {
    name: 'Gaming Headset',
    description: '7.1 surround sound gaming headset with microphone',
    price: 3499.00,
    category: 'Audio',
    subcategory: 'Gaming Headsets',
    brand: 'Razer',
    stock: 60,
    images: '["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500"]',
    is_active: true
  }
];

const addCleanProducts = async () => {
  try {
    console.log('🔄 Adding sample products to clean database...');
    
    for (const product of sampleProducts) {
      const query = `
        INSERT INTO products (name, description, price, category, subcategory, brand, stock, images, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (name) DO NOTHING
      `;
      
      await pool.query(query, [
        product.name,
        product.description,
        product.price,
        product.category,
        product.subcategory,
        product.brand,
        product.stock,
        product.images,
        product.is_active
      ]);
      
      console.log(`✅ Added: ${product.name} - ₹${product.price}`);
    }
    
    console.log('\n🎉 All sample products added successfully!');
    
    // Display current products
    const result = await pool.query('SELECT id, name, price, category, stock FROM products ORDER BY id DESC LIMIT 10');
    console.log('\n📦 Current Products in Database:');
    console.log('ID | Name                    | Price     | Category     | Stock');
    console.log('---|-------------------------|-----------|-------------|------');
    result.rows.forEach(product => {
      const name = product.name.padEnd(24);
      const price = `₹${product.price}`.padEnd(10);
      const category = product.category.padEnd(12);
      console.log(`${product.id} | ${name} | ${price} | ${category} | ${product.stock}`);
    });
    
  } catch (error) {
    console.error('❌ Error adding products:', error);
  }
};

// Run if called directly
if (require.main === module) {
  addCleanProducts();
}

module.exports = { addCleanProducts };
