const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════════════════════
// Conversation Schema — groups messages between two users, optionally about
// a product or shop
// ═══════════════════════════════════════════════════════════════════════════════
const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      ],
      validate: {
        validator: function (v) {
          return v.length === 2;
        },
        message: 'A conversation must have exactly 2 participants'
      }
    },

    // Optional context — what the conversation is about
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null
    },

    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      default: null
    },

    giveaway: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Giveaway',
      default: null
    },

    // Snapshot of the last message for quick preview
    lastMessage: {
      text: { type: String, default: '' },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      sentAt: { type: Date, default: Date.now }
    },

    // Per-participant unread counts (keyed by stringified userId)
    unreadCount: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  { timestamps: true }
);

// Ensure a unique conversation per pair of participants + product context
conversationSchema.index({ participants: 1, product: 1 }, { unique: true });
conversationSchema.index({ 'lastMessage.sentAt': -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

// ═══════════════════════════════════════════════════════════════════════════════
// Message Schema — individual chat messages within a conversation
// ═══════════════════════════════════════════════════════════════════════════════
const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    text: {
      type: String,
      required: [true, 'Message text is required'],
      maxlength: 2000
    },

    attachments: {
      type: [String],
      default: []
    },

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

messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ sender: 1 });

const Message = mongoose.model('Message', messageSchema);

// ── Export both models ──────────────────────────────────────────────────────
module.exports = { Conversation, Message };
