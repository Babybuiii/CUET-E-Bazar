/**
 * notifications.js
 *
 * REST API routes for user notifications (e.g. giveaway claims, orders, messages, queries).
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');

// Groups the UI cares about, mapped to model types
const TYPE_GROUPS = {
  orders: ['new_order', 'order_update'],
  messages: ['new_message'],
  queries: ['new_query', 'new_answer']
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/notifications - Recent notifications for the signed-in user
//   ?unreadOnly=true   only unread
//   ?group=orders|messages|queries
//   ?limit=30
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/', authenticate, async (req, res) => {
  try {
    const { unreadOnly, group, limit = 30 } = req.query;
    const filter = { recipient: req.user._id };

    if (unreadOnly === 'true') filter.isRead = false;
    if (group && TYPE_GROUPS[group]) filter.type = { $in: TYPE_GROUPS[group] };

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate('claimant', 'fullName userId department hall avatarUrl isVerified')
        .sort({ createdAt: -1 })
        .limit(Math.min(Number(limit) || 30, 100))
        .lean(),
      Notification.countDocuments({ recipient: req.user._id, isRead: false })
    ]);

    return res.json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications
    });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/notifications/unread-count - Badge counts, split by group
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const rows = await Notification.aggregate([
      { $match: { recipient: req.user._id, isRead: false } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const byType = Object.fromEntries(rows.map((r) => [r._id, r.count]));
    const sumOf = (types) => types.reduce((sum, t) => sum + (byType[t] || 0), 0);

    return res.json({
      success: true,
      total: rows.reduce((sum, r) => sum + r.count, 0),
      orders: sumOf(TYPE_GROUPS.orders),
      messages: sumOf(TYPE_GROUPS.messages),
      queries: sumOf(TYPE_GROUPS.queries),
      byType
    });
  } catch (err) {
    console.error('Unread count error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load unread count.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/notifications/:id/read - Mark one read
// ═══════════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/notifications/mark-all-read & /read-all - Mark everything read
// ═══════════════════════════════════════════════════════════════════════════════
const handleMarkAllRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    return res.json({ success: true, updated: result.modifiedCount, message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark all read error:', err);
    return res.status(500).json({ success: false, message: 'Failed to mark notifications read.' });
  }
};

router.patch('/mark-all-read', authenticate, handleMarkAllRead);
router.patch('/read-all', authenticate, handleMarkAllRead);

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/notifications/:id - Delete a notification
// ═══════════════════════════════════════════════════════════════════════════════
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID.' });
    }

    const deleted = await Notification.findOneAndDelete({
      _id: id,
      recipient: req.user._id
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    return res.json({ success: true, message: 'Notification removed.' });
  } catch (err) {
    console.error('Delete notification error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete notification.' });
  }
});

module.exports = router;
