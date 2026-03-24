const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./config/database');
const { initializeTables } = require('./config/createTables');
require('dotenv').config();

const app = express();

// Trust proxy settings for Render deployment
app.set('trust proxy', true);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  trustProxy: true // Fix for X-Forwarded-For header issue
});
app.use(limiter);

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'https://unitech-murex.vercel.app',
  'https://unitech-murex.vercel.app/',
  'https://unitech-25am5o8zy-vishwas-nains-projects-4cf21a16.vercel.app',
  'https://unitech-25am5o8zy-vishwas-nains-projects-4cf21a16.vercel.app/',
  'https://unitech-okiy04vb5-vishwas-nains-projects-4cf21a16.vercel.app',
  'https://unitech-okiy04vb5-vishwas-nains-projects-4cf21a16.vercel.app/',
  'https://unitech-lfekpujpo-vishwas-nains-projects-4cf21a16.vercel.app',
  'https://unitech-lfekpujpo-vishwas-nains-projects-4cf21a16.vercel.app/',
  'https://unitech-n9py0rxcl-vishwas-nains-projects-4cf21a16.vercel.app',
  'https://unitech-n9py0rxcl-vishwas-nains-projects-4cf21a16.vercel.app/'
];

// In development, allow all origins
if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push('*');
}

// Dynamic CORS middleware to handle Vercel deployments
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Allow all Vercel domains (pattern matching for future deployments)
    if (origin.includes('vercel.app') && origin.includes('vishwas-nains-projects')) {
      console.log('Allowing Vercel origin:', origin);
      return callback(null, true);
    }
    
    // In production, be more restrictive
    if (process.env.NODE_ENV === 'production') {
      console.log('CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
    
    // In development, allow all
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control', 'Pragma'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// PostgreSQL connection and table initialization
pool.query('SELECT NOW()', async (err, res) => {
  if (err) {
    console.error('❌ PostgreSQL connection error:', err);
    console.log('💡 Please check your DATABASE_URL in .env file');
    process.exit(1);
  } else {
    console.log('✅ Connected to Neon PostgreSQL');
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Initialize tables (keep existing data)
    await initializeTables();

    // Temporary route to add sample products (remove in production)
    app.post('/api/admin/add-clean-products', async (req, res) => {
      try {
        const { addCleanProducts } = require('./scripts/addCleanProducts');
        await addCleanProducts();
        res.json({ message: 'Clean sample products added successfully' });
      } catch (error) {
        console.error('Error adding clean products:', error);
        res.status(500).json({ message: 'Failed to add clean sample products' });
      }
    });

    // Production route to add all client products
    app.post('/api/admin/add-all-products', async (req, res) => {
      try {
        const { addAllClientProducts } = require('./scripts/addAllClientProducts');
        await addAllClientProducts();
        res.json({ message: 'All client products added successfully' });
      } catch (error) {
        console.error('Error adding all client products:', error);
        res.status(500).json({ message: 'Failed to add all client products' });
      }
    });
  }
});

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/newsletter', require('./routes/newsletterRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      errors: Object.values(error.errors).map(err => err.message)
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  res.status(error.statusCode || 500).json({
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Server URL: ${process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + PORT}`);
});

module.exports = app;
// Force deployment fix
