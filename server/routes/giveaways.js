/**
 * giveawayRoutes.js
 *
 * REST API routes for the Giveaways feature.
 * Reuses existing:
 *   - authenticate middleware  (server/middleware/auth.js)
 *   - Cloudinary upload config (server/config/cloudinary.js)
 *   - requireGiveawayEligibility (server/middleware/giveawayEligibility.js)
 */

const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');

const { authenticate } = require('../middleware/auth');
const { requireGiveawayEligibility } = require('../middleware/giveawayEligibility');
const { upload, isCloudinaryConfigured } = require('../config/cloudinary');

const {
  getGiveaways,
  getGiveawayById,
  createGiveaway,
  claimGiveaway,
  initiateContact,
  cancelGiveaway,
  getMyGiveaways,
  getMyClaims
} = require('../controllers/giveawayController');

// ── Public routes ─────────────────────────────────────────────────────────────

/**
 * GET /api/giveaways
 * Query params: category, location, search, hideClaimed, limit
 */
router.get('/', getGiveaways);

/**
 * GET /api/giveaways/my-giveaways
 * Donor's own listings (auth required)
 */
router.get('/my-giveaways', authenticate, getMyGiveaways);

/**
 * GET /api/giveaways/my-claims
 * User's claim activity (auth required)
 */
router.get('/my-claims', authenticate, getMyClaims);

/**
 * GET /api/giveaways/:id
 * Optionally attach user context if authenticated (for field visibility)
 */
router.get('/:id', (req, res, next) => {
  // Optionally decode token without hard-failing so the route stays public
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_cuet_ebazar_key_2026';
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      const User    = require('../models/User');
      User.findById(decoded.id).then(user => {
        req.user = user || undefined;
        next();
      }).catch(() => next());
    } catch {
      next();
    }
  } else {
    next();
  }
}, getGiveawayById);

// ── Authenticated + Eligible routes ───────────────────────────────────────────

/**
 * POST /api/giveaways
 * Create a giveaway. Images optional (up to 5).
 */
router.post(
  '/',
  authenticate,
  requireGiveawayEligibility,
  upload.array('images', 5),
  createGiveaway
);

/**
 * POST /api/giveaways/:id/claim
 * Submit or join a claim for a giveaway.
 */
router.post(
  '/:id/claim',
  authenticate,
  requireGiveawayEligibility,
  claimGiveaway
);

/**
 * POST /api/giveaways/:id/contact
 * Winner initiates contact with the donor.
 */
router.post(
  '/:id/contact',
  authenticate,
  initiateContact
);

/**
 * DELETE /api/giveaways/:id
 * Cancel a giveaway (donor or admin only).
 */
router.delete(
  '/:id',
  authenticate,
  cancelGiveaway
);

module.exports = router;

