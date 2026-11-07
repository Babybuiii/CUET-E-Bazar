const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_cuet_ebazar_key_2026';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing or invalid.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.'
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: `Your account has been permanently banned by platform administrators. Reason: ${user.banReason || 'Violation of community guidelines.'}`
      });
    }

    if (user.isSuspended) {
      if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
        const untilStr = new Date(user.suspendedUntil).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        return res.status(403).json({
          success: false,
          message: `Your account is temporarily suspended until ${untilStr}. Reason: ${user.suspensionReason || 'Policy violation.'}`
        });
      } else if (user.suspendedUntil && new Date(user.suspendedUntil) <= new Date()) {
        // Automatic lift of expired suspension
        user.isSuspended = false;
        user.suspendedUntil = null;
        user.suspensionReason = '';
        await user.save();
      } else {
        return res.status(403).json({
          success: false,
          message: `Your account is temporarily suspended. Reason: ${user.suspensionReason || 'Under moderation review.'}`
        });
      }
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session token. Please log in again.'
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required.'
    });
  }
  next();
};

module.exports = { authenticate, requireAdmin };
