const pool = require('./database');

const createCleanTables = async () => {
  try {
    console.log('🔄 Creating clean database structure...');

    // Drop existing tables to start fresh
    await pool.query('DROP TABLE IF EXISTS orders CASCADE');
    await pool.query('DROP TABLE IF EXISTS newsletters CASCADE');
    await pool.query('DROP TABLE IF EXISTS carts CASCADE');
    await pool.query('DROP TABLE IF EXISTS products CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');

    console.log('🗑️  Dropped existing tables');

    // Create clean users table
    const createUsersTable = `
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        mobile VARCHAR(20) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        is_verified BOOLEAN DEFAULT false,
        email_verification_code VARCHAR(255),
        email_verification_expires TIMESTAMP,
        password_reset_token VARCHAR(255),
        password_reset_expires TIMESTAMP,
        mobile_verification_code VARCHAR(255),
        mobile_verification_expires TIMESTAMP,
        otp_attempts INTEGER DEFAULT 0,
        last_otp_sent TIMESTAMP,
        profile_image TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createUsersTable);
    console.log('✅ Users table created');

    // Create clean products table
    const createProductsTable = `
      CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(100),
        subcategory VARCHAR(100),
        brand VARCHAR(100),
        stock INTEGER DEFAULT 0,
        images TEXT[],
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createProductsTable);
    console.log('✅ Products table created');

    // Create clean carts table
    const createCartsTable = `
      CREATE TABLE carts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id)
      );
    `;
    await pool.query(createCartsTable);
    console.log('✅ Carts table created');

    // Create clean orders table
    const createOrdersTable = `
      CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        total DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        payment_status VARCHAR(50) DEFAULT 'pending',
        payment_method VARCHAR(50),
        payment_id VARCHAR(255),
        shipping_address TEXT,
        order_items JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createOrdersTable);
    console.log('✅ Orders table created');

    // Create clean newsletters table
    const createNewslettersTable = `
      CREATE TABLE newsletters (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(100),
        preferences JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createNewslettersTable);
    console.log('✅ Newsletters table created');

    console.log('🎉 Clean database structure created successfully!');

    // Show table structure
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('\n📋 Current tables in database:');
    tables.rows.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });

  } catch (error) {
    console.error('❌ Error creating clean database:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  createCleanTables()
    .then(() => {
      console.log('✅ Database cleanup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { createCleanTables };
