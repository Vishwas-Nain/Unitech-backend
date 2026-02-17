require('dotenv').config();
const { Pool } = require('pg');

// Use production Neon database directly
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Products extracted from client Products.js
const clientProducts = [
  {
    name: "Apple MacBook Air M4 14inch (Refurbished)",
    brand: "Apple",
    model: "M4 Air",
    description: "14-inch Retina display, M4 chip, 16GB RAM, 256GB SSD",
    price: 82000.00,
    category: "Laptops",
    subcategory: "MacBooks",
    stock: 25,
    images: '["/images/Apple m4 air.jpeg", "/images/M4 air (2).jpg", "/images/M4 air (3).jpg", "/images/M4 air (4).jpg"]',
    is_active: true
  },
  {
    name: "Apple MacBook pro A1989 with Touch Bar (Refurbished)",
    brand: "Apple",
    model: "A1989",
    description: "16-inch Retina display, Intel Core i5, 8GB RAM, 256GB SSD",
    price: 21500.00,
    category: "Laptops",
    subcategory: "Pro Laptops",
    stock: 20,
    images: '["/images/A1989.jpg", "/images/A1989 (1).jpg", "/images/A1989 (2).jpg", "/images/A1989 (3).jpg"]',
    is_active: true
  },
  {
    name: "Apple MacBook pro M1 (2021) (Refurbished)",
    brand: "Apple",
    model: "M1 Pro",
    description: "16-inch Retina display, M1 chip, 32GB RAM, 512GB SSD",
    price: 84000.00,
    category: "Laptops",
    subcategory: "Pro Laptops",
    stock: 15,
    images: '["/images/m1 pro 16inch.jpg", "/images/M1 pro (3).jpg"]',
    is_active: true
  },
  {
    name: "Apple MacBook M3 Pro (Refurbished)",
    brand: "Apple",
    model: "M3 Pro",
    description: "16-inch Retina display, M3 chip, 18GB RAM, 512GB SSD",
    price: 84000.00,
    category: "Laptops",
    subcategory: "Pro Laptops",
    stock: 30,
    images: '["/images/M3 pro.png", "/images/M3 pro (2).jpg", "/images/M3 pro (3).jpg"]',
    is_active: true
  },
  {
    name: "Dell latitude 5420 (Refurbished)",
    brand: "Dell",
    model: "5420",
    description: "15.6-inch 360Hz display, Intel Core i7, 11th gen, 16GB RAM, 512GB SSD, with Touchpad",
    price: 21500.00,
    category: "Laptops",
    subcategory: "Business Laptops",
    stock: 18,
    images: '["/images/Dell 5420.jpg"]',
    is_active: true
  },
  {
    name: "Lenovo L460 (Refurbished)",
    brand: "Lenovo",
    model: "L460",
    description: "15.6-inch 360Hz display, Intel Core i5, 6th gen, 8GB RAM, 512GB SSD",
    price: 11500.00,
    category: "Laptops",
    subcategory: "Business Laptops",
    stock: 22,
    images: '["/images/Lenovo L460.jpg"]',
    is_active: true
  },
  {
    name: "Lenovo X1 Yoga (Refurbished)",
    brand: "Lenovo",
    model: "X1 Yoga",
    description: "14-inch 360Hz display, Intel Core i7, 8th gen, 16GB RAM, 256GB NVMe SSD",
    price: 20000.00,
    category: "Laptops",
    subcategory: "Ultrabooks",
    stock: 12,
    images: '["/images/X1 yoga.jpg"]',
    is_active: true
  },
  {
    name: "Lenovo X1 Carbon (Refurbished)",
    brand: "Lenovo",
    model: "X1 Carbon",
    description: "14-inch 360Hz display, Intel Core i7, 7th gen, 16GB RAM, 256GB NVMe SSD",
    price: 13000.00,
    category: "Laptops",
    subcategory: "Ultrabooks",
    stock: 8,
    images: '["/images/X1 carbon.jpg"]',
    is_active: true
  },
  {
    name: "Dell Latitude 3420 (Refurbished)",
    brand: "Dell",
    model: "Latitude 3420",
    description: "14-inch 360Hz display, Intel Core i5, 11th gen, 8GB RAM, 256GB SSD",
    price: 18000.00,
    category: "Laptops",
    subcategory: "Business Laptops",
    stock: 25,
    images: '["/images/Dell 3420 (1).jpg", "/images/Dell 3420 (2).jpg", "/images/Dell 3420 (3).png"]',
    is_active: true
  },
  {
    name: "HP EliteBook 440 G8 (Refurbished)",
    brand: "HP",
    model: "EliteBook 440 G8",
    description: "14-inch 360Hz display, Intel Core i5, 8GB RAM, 256GB SSD",
    price: 16000.00,
    category: "Laptops",
    subcategory: "Business Laptops",
    stock: 10,
    images: '["/images/HP 440.jpg"]',
    is_active: true
  }
];

const addClientProducts = async () => {
  try {
    console.log('🔄 Adding client products to database...');
    
    for (const product of clientProducts) {
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
    
    console.log('\n🎉 All client products added successfully!');
    
    // Display current products
    const result = await pool.query('SELECT id, name, price, category, stock FROM products ORDER BY id DESC LIMIT 15');
    console.log('\n📦 Current Products in Database:');
    console.log('ID | Name                    | Price     | Category     | Stock');
    console.log('---|-------------------------|-----------|-------------|------');
    result.rows.forEach(product => {
      const name = product.name.padEnd(30);
      const price = `₹${product.price}`.padEnd(10);
      const category = product.category.padEnd(12);
      console.log(`${product.id} | ${name} | ${price} | ${category} | ${product.stock}`);
    });
    
  } catch (error) {
    console.error('❌ Error adding client products:', error);
  }
};

// Run if called directly
if (require.main === module) {
  addClientProducts();
}

module.exports = { addClientProducts };
