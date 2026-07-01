const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Session expired. Please log in again.', 401);
      }
      if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
        throw new AppError('Invalid token. Please log in again.', 401);
      }
      throw error;
    }

    const user = await User.findById(decoded.id).select('-password').populate('role', 'name permissions');

    if (!user) {
      throw new AppError('User not found in system', 401);
    }

    req.user = user;
    return next();
  }

  throw new AppError('Not authorized, no token provided', 401);
});

const adminOnly = (req, res, next) => {
  if (req.user?.email !== 'admin@elitehire.com') {
    return next(new AppError('Access denied. Administrator privileges required.', 403));
  }
  next();
};

module.exports = { protect, adminOnly };
