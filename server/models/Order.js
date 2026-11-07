const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    // ── Parties ─────────────────────────────────────────────────────────────
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // ── Product ─────────────────────────────────────────────────────────────
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },

    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      default: null
    },

    // ── Order Details ───────────────────────────────────────────────────────
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },

    // ── Status ──────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'completed', 'cancelled'],
      default: 'pending'
    },

    completedAt: {
      type: Date,
      default: null
    },

    cancelledAt: {
      type: Date,
      default: null
    },

    cancelReason: {
      type: String,
      default: ''
    },

    // ── Review Pop-up Trigger ───────────────────────────────────────────────
    hasBeenReviewed: {
      type: Boolean,
      default: false
    },

    // ── Notes ───────────────────────────────────────────────────────────────
    buyerNotes: {
      type: String,
      maxlength: 500,
      default: ''
    },

    meetupLocation: {
      type: String,
      default: 'CUET Campus'
    }
  },
  { timestamps: true }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
orderSchema.index({ buyer: 1, status: 1 });
orderSchema.index({ seller: 1, status: 1 });
orderSchema.index({ product: 1 });
orderSchema.index({ shop: 1 });
orderSchema.index({ status: 1, hasBeenReviewed: 1 }); // for review pop-up queries
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
