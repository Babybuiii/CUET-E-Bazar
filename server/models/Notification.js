const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // ── Recipient ───────────────────────────────────────────────────────────
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // ── Notification Type ───────────────────────────────────────────────────
    type: {
      type: String,
      required: true,
      enum: {
        values: [
          'new_order',
          'order_update',
          'new_message',
          'new_query',
          'new_answer',
          'new_review',
          'admin_warning',
          'giveaway_update',
          'giveaway_claimed',
          'price_drop',
          'recommendation',
          'report_update',
          'shop_follower'
        ],
        message: '{VALUE} is not a valid notification type'
      }
    },

    // ── Content ─────────────────────────────────────────────────────────────
    title: {
      type: String,
      required: true,
      maxlength: 120
    },

    message: {
      type: String,
      required: true,
      maxlength: 500
    },

    // ── Deep Link ───────────────────────────────────────────────────────────
    linkType: {
      type: String,
      enum: ['product', 'shop', 'order', 'conversation', 'giveaway', 'report', 'user', 'query'],
      default: null
    },

    linkId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    // ── Claimant (for giveaway claims) ───────────────────────────────────────
    claimant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // ── Additional Payload ───────────────────────────────────────────────────
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // ── Read Status ─────────────────────────────────────────────────────────
    isRead: {
      type: Boolean,
      default: false
    },

    readAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
