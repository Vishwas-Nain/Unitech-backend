const pool = require('./database');

const createUsersTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      mobile VARCHAR(10) UNIQUE NOT NULL,
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

  try {
    await pool.query(query);
    console.log('✅ Users table created or already exists');
  } catch (error) {
    console.error('❌ Error creating users table:', error);
    throw error;
  }
};

const createProductsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      category VARCHAR(100),
      brand VARCHAR(100),
      stock INTEGER DEFAULT 0,
      images TEXT[],
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(query);
    console.log('✅ Products table created or already exists');
  } catch (error) {
    console.error('❌ Error creating products table:', error);
    throw error;
  }
};

const createCartsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS carts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id)
    );
  `;

  try {
    await pool.query(query);
    console.log('✅ Carts table created or already exists');
  } catch (error) {
    console.error('❌ Error creating carts table:', error);
    throw error;
  }
};

const initializeTables = async () => {
  try {
    await createUsersTable();
    await createProductsTable();
    await createCartsTable();
    console.log('🎉 All tables initialized successfully');
  } catch (error) {
    console.error('💥 Failed to initialize tables:', error);
  }
};

module.exports = {
  initializeTables,
  createUsersTable,
  createProductsTable,
  createCartsTable
};
