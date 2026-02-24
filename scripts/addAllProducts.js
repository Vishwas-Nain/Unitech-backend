// Clean script to add all products from Products.js to Neon database
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../config/database');

// All products extracted from client/src/pages/Products.js
const allProducts = [
  // Laptops (IDs 1-31)
  {
    id: 1,
    name: "Apple MacBook Air M4 14inch (Refurbished)",
    description: "14-inch Retina display, M4 chip, 16GB RAM, 256GB SSD",
    price: 82000.00,
    category: "laptops",
    subcategory: "MacBooks",
    brand: "Apple",
    stock: 25,
    images: '{"Apple m4 air.jpeg", "M4 air (2).jpg", "M4 air (3).jpg", "M4 air (4).jpg"}',
    is_active: true
  },
  {
    id: 2,
    name: "Apple MacBook pro A1989 with Touch Bar (Refurbished)",
    description: "16-inch Retina display, Intel Core i5, 8GB RAM, 256GB SSD",
    price: 21500.00,
    category: "laptops",
    subcategory: "Pro Laptops",
    brand: "Apple",
    stock: 20,
    images: '{"A1989.jpg", "A1989 (1).jpg", "A1989 (2).jpg", "A1989 (3).jpg"}',
    is_active: true
  },
  {
    id: 3,
    name: "Apple MacBook pro M1 (2021) (Refurbished)",
    description: "16-inch Retina display, M1 chip, 32GB RAM, 512GB SSD",
    price: 84000.00,
    category: "laptops",
    subcategory: "Pro Laptops",
    brand: "Apple",
    stock: 15,
    images: '{"m1 pro 16inch.jpg", "M1 pro (3).jpg"}',
    is_active: true
  },
  {
    id: 4,
    name: "Apple MacBook M3 Pro (Refurbished)",
    description: "16-inch Retina display, M3 chip, 18GB RAM, 512GB SSD",
    price: 84000.00,
    category: "laptops",
    subcategory: "Pro Laptops",
    brand: "Apple",
    stock: 30,
    images: '{"M3 pro.png", "M3 pro (2).jpg", "M3 pro (3).jpg"}',
    is_active: true
  },
  {
    id: 5,
    name: "Dell latitude 5420 (Refurbished)",
    description: "15.6-inch 360Hz display, Intel Core i7, 11th gen, 16GB RAM, 512GB SSD, with Touchpad",
    price: 21500.00,
    category: "laptops",
    subcategory: "Business Laptops",
    brand: "Dell",
    stock: 18,
    images: '{"Dell 5420.jpg"}',
    is_active: true
  },
  {
    id: 6,
    name: "Lenovo L460 (Refurbished)",
    description: "15.6-inch 360Hz display, Intel Core i5, 6th gen, 8GB RAM, 512GB SSD",
    price: 11500.00,
    category: "laptops",
    subcategory: "Business Laptops",
    brand: "Lenovo",
    stock: 22,
    images: '{"Lenovo L460.jpg"}',
    is_active: true
  },
  {
    id: 7,
    name: "Lenovo X1 Yoga (Refurbished)",
    description: "14-inch 360Hz display, Intel Core i7, 8th gen, 16GB RAM, 256GB NVMe SSD",
    price: 20000.00,
    category: "laptops",
    subcategory: "Ultrabooks",
    brand: "Lenovo",
    stock: 12,
    images: '{"X1 yoga.jpg"}',
    is_active: true
  },
  {
    id: 8,
    name: "Lenovo X1 Carbon (Refurbished)",
    description: "14-inch 360Hz display, Intel Core i7, 7th gen, 16GB RAM, 256GB NVMe SSD",
    price: 13000.00,
    category: "laptops",
    subcategory: "Ultrabooks",
    brand: "Lenovo",
    stock: 8,
    images: '{"X1 carbon.jpg"}',
    is_active: true
  },
  {
    id: 9,
    name: "Dell Latitude 3420 (Refurbished)",
    description: "14-inch 360Hz display, Intel Core i5, 11th gen, 8GB RAM, 256GB SSD",
    price: 18000.00,
    category: "laptops",
    subcategory: "Business Laptops",
    brand: "Dell",
    stock: 25,
    images: '{"Dell 3420 (1).jpg", "Dell 3420 (2).jpg", "Dell 3420 (3).png"}',
    is_active: true
  },
  {
    id: 10,
    name: "HP EliteBook 440 G8 (Refurbished)",
    description: "14-inch 360Hz display, Intel Core i5, 11th gen, 8GB RAM, 256GB NVMe SSD",
    price: 18000.00,
    category: "laptops",
    subcategory: "Business Laptops",
    brand: "HP",
    stock: 10,
    images: '{"HP 440 G8.jpg"}',
    is_active: true
  },
  {
    id: 11,
    name: "HP Pavilion 15 (Refurbished)",
    description: "15.6-inch 360Hz display, Intel Core i5, 7th gen, 16GB RAM, 512GB SSD, Backlit Keyboard",
    price: 22500.00,
    category: "laptops",
    subcategory: "Consumer Laptops",
    brand: "HP",
    stock: 15,
    images: '{"Pavilion i5.jpg"}',
    is_active: true
  },
  {
    id: 12,
    name: "HP Pavilion gaming 15",
    description: "15.6-inch 360Hz display, AMD Ryzen 5 4600H, 7th gen, 16GB RAM, 512GB SSD, Backlit Keyboard",
    price: 24500.00,
    category: "laptops",
    subcategory: "Gaming Laptops",
    brand: "HP",
    stock: 12,
    images: '{"HP amd 5.jpg"}',
    is_active: true
  },
  {
    id: 13,
    name: "Dell Latitude 5410",
    description: "14-inch FHD display, Intel Core i7, 10th gen, 8GB RAM, 256GB SSD",
    price: 24500.00,
    category: "laptops",
    subcategory: "Business Laptops",
    brand: "Dell",
    stock: 20,
    images: '{"Dell 5410.jpg"}',
    is_active: true
  },
  {
    id: 14,
    name: "Dell Latitude 7490",
    description: "14-inch FHD display, Intel Core i7, 8th gen, 8GB RAM, 256GB SSD",
    price: 24500.00,
    category: "laptops",
    subcategory: "Business Laptops",
    brand: "Dell",
    stock: 18,
    images: '{"Dell 7490.jpg"}',
    is_active: true
  },
  {
    id: 15,
    name: "Apple MacBook M2 Pro",
    description: "16-inch Retina display, M2 Pro chip, 32GB RAM, 512GB SSD",
    price: 82000.00,
    category: "laptops",
    subcategory: "Pro Laptops",
    brand: "Apple",
    stock: 10,
    images: '{"m2 pro (1).jpg", "m2 pro (2).jpg", "m2 pro (3).jpg"}',
    is_active: true
  },
  {
    id: 16,
    name: "Apple MacBook Pro A2251",
    description: "13.3-inch Retina display, 16GB RAM, 512GB SSD",
    price: 33000.00,
    category: "laptops",
    subcategory: "Pro Laptops",
    brand: "Apple",
    stock: 8,
    images: '{"A2251 (2).jpg", "A2251 (3).jpg", "A2251 (4).jpg", "A2251 (5).jpg"}',
    is_active: true
  },
  {
    id: 17,
    name: "Dell Latitude 3510",
    description: "15.6-inch Retina display, 16GB RAM, 512GB SSD",
    price: 14500.00,
    category: "laptops",
    subcategory: "Business Laptops",
    brand: "Dell",
    stock: 25,
    images: '{"Dell 3510 (1).jpg", "Dell 3510 (2).jpg"}',
    is_active: true
  },
  {
    id: 18,
    name: "Dell Latitude 3520",
    description: "15.6-inch Retina display, 8GB RAM, 256GB SSD",
    price: 15500.00,
    category: "laptops",
    subcategory: "Business Laptops",
    brand: "Dell",
    stock: 30,
    images: '{"Dell 3520 (1).jpg", "Dell 3520 (3).jpg", "Dell 3520 (4).jpg"}',
    is_active: true
  },
  {
    id: 19,
    name: "Dell Latitude 3410",
    description: "15.6-inch Retina display, 8GB RAM, 256GB SSD",
    price: 14000.00,
    category: "laptops",
    subcategory: "Business Laptops",
    brand: "Dell",
    stock: 22,
    images: '{"Dell 3410 (1).jpg", "Dell 3410 (2).jpg", "Dell 3410 (4).jpg"}',
    is_active: true
  },
  {
    id: 20,
    name: "Dell Latitude 7410",
    description: "15.6-inch Retina display, 8GB RAM, 256GB SSD",
    price: 17000.00,
    category: "laptops",
    subcategory: "Business Laptops",
    brand: "Dell",
    stock: 15,
    images: '{"Dell 7410 (1).jpg", "Dell 7410 (2).jpg", "Dell 7410 (3).jpg"}',
    is_active: true
  },
  {
    id: 21,
    name: "Dell Latitude 3400",
    description: "15.6-inch Retina display, 8GB RAM, 256GB SSD",
    price: 11500.00,
    category: "laptops",
    subcategory: "Business Laptops",
    brand: "Dell",
    stock: 20,
    images: '{"Dell 3400 (1).jpg", "Dell 3400 (2).jpg", "Dell 3400 (3).png"}',
    is_active: true
  },
  {
    id: 22,
    name: "Lenovo X1",
    description: "14-inch Full HD display, 8GB RAM, 256GB SSD",
    price: 16000.00,
    category: "laptops",
    subcategory: "Business Laptops",
    brand: "Lenovo",
    stock: 15,
    images: '{"Lenovo x1 (1).jpeg", "Lenovo x1 (2).jpg", "Lenovo x1 (3).jpg"}',
    is_active: true
  },
  {
    id: 23,
    name: "Lenovo P14 S Touch Screen",
    description: "14-inch QHD 4K display, 8GB RAM, 256GB SSD",
    price: 17500.00,
    category: "laptops",
    subcategory: "Business Laptops",
    brand: "Lenovo",
    stock: 10,
    images: '{"Lenovo p14.jpg", "Lenovo p14 (2).jpg", "Lenovo p14 (3).jpg", "Lenovo p14 (4).jpg"}',
    is_active: true
  },
  {
    id: 24,
    name: "Lenovo P43 S",
    description: "14-inch FHD display, 8GB RAM, 256GB SSD",
    price: 15000.00,
    category: "laptops",
    subcategory: "Business Laptops",
    brand: "Lenovo",
    stock: 15,
    images: '{"Lenovo p43 (1).jpg", "Lenovo p43 (2).jpg", "Lenovo p43 (3).jpg", "Lenovo p43 (4).jpg"}',
    is_active: true
  },
  {
    id: 26,
    name: "Lenovo ThinkPad T14 (Gen 1) (Refurbished)",
    description: "14-inch FHD display, 8GB RAM, 256GB SSD",
    price: 14000.00,
    category: "laptops",
    subcategory: "Business Laptops",
    brand: "Lenovo",
    stock: 20,
    images: '{"lenovo t14 (1).jpg", "lenovo t14 (2).jpg", "lenovo t14 (3).jpg"}',
    is_active: true
  },
  {
    id: 27,
    name: "HP EliteBook 840 G7 (Refurbished)",
    description: "14-inch FHD display, 8GB RAM, 256GB SSD",
    price: 20500.00,
    category: "laptops",
    subcategory: "Business Laptops",
    brand: "HP",
    stock: 12,
    images: '{"Hp 840 (1).jpg", "Hp 840 (2).jpg", "Hp 840 (3).jpg", "Hp 840 (4).jpg"}',
    is_active: true
  },
  {
    id: 28,
    name: "HP EliteBook 850 G5 Touch Screen (Refurbished)",
    description: "15.6-inch 4K UHD display, 8GB RAM, 256GB SSD",
    price: 15000.00,
    category: "laptops",
    subcategory: "Business Laptops",
    brand: "HP",
    stock: 8,
    images: '{"Hp 850 (1).jpg", "Hp 850 (2).jpg"}',
    is_active: true
  },
  {
    id: 29,
    name: "HP EliteBook Folio 1040 G3 (Refurbished)",
    description: "14-inch FHD display, 8GB RAM, 256GB SSD",
    price: 14000.00,
    category: "laptops",
    subcategory: "Business Laptops",
    brand: "HP",
    stock: 10,
    images: '{"Hp 1040 (1).jpg", "Hp 1040 (2).jpg"}',
    is_active: true
  },
  {
    id: 30,
    name: "HP EliteBook Folio 9480m (Refurbished)",
    description: "14″ LED-backlit screen, 8GB RAM, 256GB SSD",
    price: 7500.00,
    category: "laptops",
    subcategory: "Business Laptops",
    brand: "HP",
    stock: 15,
    images: '{"Hp 9840 (1).jpg", "Hp 9840 (2).jpg", "Hp 9840 (3).jpg"}',
    is_active: true
  },
  // Accessories (IDs 31+)
  {
    id: 31,
    name: "FRONTECH KB-0014 Black Wired Gaming Mechanical Keyboard",
    description: "A captivating game styling with cool and attractive RGB light effects, creating a bright and diverse visual experience.",
    price: 1999.00,
    category: "accessories",
    subcategory: "Keyboards",
    brand: "FRONTECH",
    stock: 50,
    images: '{"KB 0014 (1).jpg", "KB 0014 (2).jpg", "KB 0014 (3).jpg", "KB 0014 (4).jpg", "KB 0014 (5).jpg"}',
    is_active: true
  },
  {
    id: 101,
    name: "Dell KB216 Wired Multimedia Keyboard",
    description: "Full-Size Layout with USB Interface, Chiclet Keys, Spill Resistance with 3 Indicator Lights.",
    price: 1299.00,
    category: "accessories",
    subcategory: "Keyboards",
    brand: "Dell",
    stock: 30,
    images: '{"KB 216 (1).jpg", "KB 216 (2).jpg", "KB 216 (3).jpg", "KB 216 (4).jpg"}',
    is_active: true
  },
  {
    id: 102,
    name: "Intex Corona G Keyboard",
    description: "With a 1.2 m elongated wire length, this premium wired keyboard with plug and play is your ideal choice. It has a whopping 80 lac click button cycle.",
    price: 799.00,
    category: "accessories",
    subcategory: "Keyboards",
    brand: "Intex",
    stock: 25,
    images: '{"CORONA (1).jpg", "CORONA (2).jpg", "CORONA (3).jpg", "CORONA (4).jpg", "CORONA (5).jpg"}',
    is_active: true
  },
  {
    id: 103,
    name: "Frontech Wired Keyboard KB-0047",
    description: "Its sleek black design features a waterproof build and a lightweight yet sturdy construction, and it offers a USB Plug and Play connection",
    price: 399.00,
    category: "accessories",
    subcategory: "Keyboards",
    brand: "Frontech",
    stock: 30,
    images: '{"KB 0047 (1).jpg", "KB 0047 (2).jpg", "KB 0047 (3).jpg", "KB 0047 (4).jpg", "KB 0047 (5).jpg"}',
    is_active: true
  },
  {
    id: 104,
    name: "ZEBRONICS Nitro Plus Mechanical Keyboard",
    description: "The Nitro Plus Mechanical Keyboard is a premium mechanical keyboard that offers a comfortable and durable typing experience. It features a compact and lightweight design, with a 104-key layout and a 1.35-meter cable for easy positioning. The keyboard is Made of high-quality materials and is designed to be durable and long-lasting. It also includes a 1-year warranty and a 30-day money-back guarantee.",
    price: 1499.00,
    category: "accessories",
    subcategory: "Keyboards",
    brand: "ZEBRONICS",
    stock: 25,
    images: '{"NITRO (1).jpg", "NITRO (2).jpg", "NITRO (3).jpg", "NITRO (4).jpg", "NITRO (5).jpg", "NITRO (6).jpg", "NITRO (7).jpg"}',
    is_active: true
  },
  {
    id: 105,
    name: "Zebronics Transformer Gaming Keyboard and Mouse Combo",
    description: "Zebronics Transformer Gaming Keyboard and Mouse Combo,Braided Cable,Durable Al body,Multimedia keys and Gaming Mouse with 6 Buttons, Multi-Color LED Lights, High-Resolution Sensor with 3200 DPI.",
    price: 599.00,
    category: "accessories",
    subcategory: "Keyboards",
    brand: "Zebronics",
    stock: 20,
    images: '{"Trans 1.jpg", "Trans 2.jpg", "Trans 3.jpg", "Trans 4.jpg", "Trans 5.jpg", "Trans 6.jpg", "Trans 7.jpg", "trans_white 1.jpg", "trans_white 2.jpg", "trans_white 3.jpg", "trans_white 4.jpg", "trans_white 5.jpg", "trans_white 6.jpg", "trans_white 7.jpg"}',
    is_active: true
  },
  {
    id: 106,
    name: "Dell Keyboard and Mouse - KM3322W - US International",
    description: "Full-Size Layout with USB Interface, Chiclet Keys, Spill Resistance with 3 Indicator Lights.",
    price: 1499.00,
    category: "accessories",
    subcategory: "Keyboards",
    brand: "Dell",
    stock: 25,
    images: '{"Dell KM 1.jpg", "Dell KM 2.jpg", "Dell KM 3.jpg", "Dell KM 4.jpg"}',
    is_active: true
  },
  {
    id: 107,
    name: "Logitech G Pro X Superlight",
    description: "Premium wireless gaming mouse with ultra-lightweight design and HERO sensor",
    price: 1499.00,
    category: "accessories",
    subcategory: "Keyboards",
    brand: "Logitech",
    stock: 25,
    images: '{"Dell KM 1.jpg", "Dell KM 2.jpg", "Dell KM 3.jpg", "Dell KM 4.jpg"}',
    is_active: true
  }
];

async function addAllProducts() {
  let client;
  try {
    console.log('🔄 Adding all products to Neon database...');
    
    // Connect to database
    client = await pool.connect();
    console.log('✅ Connected to Neon database');
    
    // Clear existing products
    await client.query('DELETE FROM products');
    console.log('🗑️ Cleared existing products');
    
    // Reset sequence
    await client.query('ALTER SEQUENCE products_id_seq RESTART WITH 1');
    console.log('🔄 Reset ID sequence');
    
    // Add all products
    for (const product of allProducts) {
      const query = `
        INSERT INTO products (name, description, price, category, subcategory, brand, stock, images, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, name
      `;
      
      const result = await client.query(query, [
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
      
      console.log(`✅ Added: ${product.name} (ID: ${result.rows[0].id})`);
    }
    
    // Verify products were added
    const countResult = await client.query('SELECT COUNT(*) as count FROM products');
    console.log(`\n📦 Total products: ${countResult.rows[0].count}`);
    
    // Show sample products
    const sampleResult = await client.query('SELECT id, name, price, category FROM products ORDER BY id LIMIT 5');
    console.log('\n📋 Sample products:');
    sampleResult.rows.forEach(product => {
      console.log(`  ID: ${product.id} | ${product.name} | ₹${product.price} | ${product.category}`);
    });
    
    console.log('\n🎉 All products added successfully to Neon database!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      client.release();
      console.log('🔌 Database connection closed');
    }
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  addAllProducts();
}

module.exports = { addAllProducts };
