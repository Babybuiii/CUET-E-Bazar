const mongoose = require('mongoose');

// ── Cart Item Sub-Schema ────────────────────────────────────────────────────
const cartItemSchema = new mongoose.Schema(
  {
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
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

// ── Cart Schema (one per user) ──────────────────────────────────────────────
const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },

    items: [cartItemSchema]
  },
  { timestamps: true }
);

// No additional indexes needed — user is already unique-indexed via schema

module.exports = mongoose.model('Cart', cartSchema);
