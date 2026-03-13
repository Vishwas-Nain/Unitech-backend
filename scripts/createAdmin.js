const mongoose = require('mongoose');
require('dotenv').config();

// Import User model
const User = require('../models/User');

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/unitech');
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@store.com' });
    if (existingAdmin) {
      console.log('Admin account already exists');
      process.exit(0);
    }

    // Create admin user
    const admin = new User({
      name: 'Admin User',
      email: 'admin@store.com',
      mobile: '9876543210',
      password: 'admin123456', // This will be hashed automatically
      role: 'admin',
      isVerified: true
    });

    await admin.save();
    console.log('✅ Admin account created successfully!');
    console.log('Email: admin@store.com');
    console.log('Password: admin123456');
    console.log('Role: admin');
    console.log('\n⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createAdmin();
