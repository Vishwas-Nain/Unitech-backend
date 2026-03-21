const jwt = require('jsonwebtoken');
const UserPostgres = require('../models/UserPostgres');

// Generate JWT token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// Protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    console.log('🔍 Auth middleware - Token check:', {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenPreview: token ? `${token.substring(0, 30)}...` : null,
      authorizationHeader: req.headers.authorization
    });

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        message: 'You are not logged in! Please log in to get access.'
      });
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token decoded successfully:', { userId: decoded.id, role: decoded.role, exp: decoded.exp });
    } catch (tokenError) {
      console.error('❌ Token verification failed:', tokenError.message);
      return res.status(401).json({
        message: 'Invalid token. Please log in again!'
      });
    }

    // Get user from token
    const currentUser = await UserPostgres.findById(decoded.id);

    if (!currentUser) {
      console.log('❌ User not found for token');
      return res.status(401).json({
        message: 'The user belonging to this token no longer exists.'
      });
    }

    console.log('👤 User verification status:', {
      userId: currentUser.id,
      isVerified: currentUser.is_verified,
      email: currentUser.email
    });

    // Check if user is verified (temporarily disabled for testing)
    // if (!currentUser.is_verified) {
    //   console.log('❌ User not verified');
    //   return res.status(401).json({
    //     message: 'Please verify your account first.'
    //   });
    // }

    // Attach user with role to request
    req.user = {
      ...currentUser,
      role: decoded.role || currentUser.role // Use role from token first, fallback to DB
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      message: 'Invalid token. Please log in again!'
    });
  }
};

// Authorize specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if user owns resource or is admin
const resourceOwnerOrAdmin = (resourceUserIdField = 'user') => {
  return (req, res, next) => {
    if (req.user.role === 'admin') {
      return next();
    }

    if (req.user.id !== req.params[resourceUserIdField]?.toString() &&
        req.user.id !== req.body[resourceUserIdField]?.toString()) {
      return res.status(403).json({
        message: 'You can only access your own resources'
      });
    }

    next();
  };
};

// Optional authentication - for routes that work with or without auth
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await UserPostgres.findById(decoded.id);

      if (currentUser) {
        req.user = currentUser;
      }
    }

    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

module.exports = {
  generateToken,
  protect,
  authorize,
  resourceOwnerOrAdmin,
  optionalAuth
};
