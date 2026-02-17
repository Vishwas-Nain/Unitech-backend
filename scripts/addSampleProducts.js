require('dotenv').config();
const pool = require('../config/database');

const sampleProducts = [
  {
    name: "Apple MacBook Air M4 14inch (Refurbished)",
    description: "14-inch Retina display, M4 chip, 16GB RAM, 256GB SSD",
    price: 82000.00,
    category: 'Laptops',
    subcategory: 'Gaming Laptops',
    brand: 'Apple',
    stock: 25,
    images: '/images/Apple m4 air.jpeg',
    is_active: true
  },
  {
    name: 'Wireless Mouse MX3',
    description: 'Ergonomic wireless mouse with precision tracking',
    price: 2499.00,
    category: 'Accessories',
    subcategory: 'Mouse',
    brand: 'TechBrand',
    stock: 150,
    images: '["https://images.unsplash.com/photo-1527864550449-7da72c6d8f48?w=500"]',
    is_active: true
  },
  {
    name: 'Mechanical Keyboard RGB',
    description: 'RGB mechanical keyboard with blue switches',
    price: 4999.00,
    category: 'Accessories',
    subcategory: 'Keyboards',
    brand: 'TechBrand',
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
    brand: 'TechBrand',
    stock: 40,
    images: '["https://images.unsplash.com/photo-15274433578-1a5a5a7d6d6d?w=500"]',
    is_active: true
  },
  {
    name: 'USB-C Hub 7-in-1',
    description: 'Multi-port USB-C hub with HDMI, USB 3.0, and SD card reader',
    price: 1999.00,
    category: 'Accessories',
    subcategory: 'USB Hubs',
    brand: 'TechBrand',
    stock: 200,
    images: '["https://images.unsplash.com/photo-1527864550449-7da72c6d8f48?w=500"]',
    is_active: true
  },
  {
    name: 'Gaming Headset Pro',
    description: '7.1 surround sound gaming headset with microphone',
    price: 3499.00,
    category: 'Audio',
    subcategory: 'Gaming Headsets',
    brand: 'TechBrand',
    stock: 60,
    images: '["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500"]',
    is_active: true
  },
  {
    name: 'Webcam HD 1080p',
    description: 'Full HD webcam with auto-focus and noise cancellation',
    price: 2999.00,
    category: 'Audio',
    subcategory: 'Webcams',
    brand: 'TechBrand',
    stock: 85,
    images: '["https://images.unsplash.com/photo-1527864550449-7da72c6d8f48?w=500"]',
    is_active: true
  },
  {
    name: 'Tablet 10" WiFi',
    description: '10-inch tablet with WiFi and 64GB storage',
    price: 12999.00,
    category: 'Tablets',
    subcategory: 'Android Tablets',
    brand: 'TechBrand',
    stock: 35,
    images: '["https://images.unsplash.com/photo-1544244015-0f4f2442d97a?w=500"]',
    is_active: true
  }
];

const addSampleProducts = async () => {
  try {
    console.log('🔄 Adding sample products to database...');
    
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
      
      console.log(`✅ Added product: ${product.name}`);
    }
    
    console.log('🎉 All sample products added successfully!');
    
    // Display added products
    const result = await pool.query('SELECT id, name, price, category, stock FROM products ORDER BY id DESC LIMIT 10');
    console.log('\n📦 Current Products in Database:');
    result.rows.forEach(product => {
      console.log(`  ID: ${product.id} | ${product.name} | ₹${product.price} | Stock: ${product.stock}`);
    });
    
  } catch (error) {
    console.error('❌ Error adding sample products:', error);
  } finally {
    await pool.end();
  }
};

// Run if called directly
if (require.main === module) {
  addSampleProducts();
}

module.exports = { addSampleProducts };
