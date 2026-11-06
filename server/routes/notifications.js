/**
 * notifications.js
 *
 * REST API routes for user notifications (e.g. giveaway claims, orders, messages).
 */

const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');

const { authenticate } = require('../middleware/auth');
const Notification     = require('../models/Notification');

/**
 * GET /api/notifications
 * Fetch latest notifications for the logged-in user.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: userId })
        .populate('claimant', 'fullName userId department hall avatarUrl isVerified')
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      Notification.countDocuments({ recipient: userId, isRead: false })
    ]);

    return res.json({
      success: true,
      unreadCount,
      notifications
    });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID.' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user._id },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    return res.json({ success: true, notification });
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ success: false, message: 'Failed to mark notification as read.' });
  }
});

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read for the logged-in user.
 */
router.patch('/mark-all-read', authenticate, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark all read error:', err);
    return res.status(500).json({ success: false, message: 'Failed to mark all as read.' });
  }
});

module.exports = router;

