/**
 * giveawayEligibility.js
 *
 * Middleware that runs AFTER `authenticate` (which attaches req.user).
 * Verifies that the authenticated user may participate in giveaways.
 *
 * Eligibility rules:
 *   - role === 'student' OR role === 'admin'
 *   - isBanned === false
 *   - Automatically ensures registered students and admins are marked isVerified: true
 */

const requireGiveawayEligibility = async (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (user.isBanned) {
    return res.status(403).json({
      success: false,
      message: 'Your account has been suspended. You cannot participate in giveaways.'
    });
  }

  const eligibleRoles = ['student', 'admin'];
  if (!eligibleRoles.includes(user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Only CUET students and administrators can participate in giveaways.'
    });
  }

  // Registered students & admins are verified CUET members.
  // Ensure isVerified is persisted so they aren't blocked by legacy unverified flags.
  if (!user.isVerified) {
    user.isVerified = true;
    try {
      await user.save();
    } catch (err) {
      console.warn('Auto-verifying user warning:', err.message);
    }
  }

  next();
};

module.exports = { requireGiveawayEligibility };

