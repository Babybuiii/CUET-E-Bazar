const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    // ── Who wrote the review ────────────────────────────────────────────────
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // ── What is being reviewed (polymorphic) ────────────────────────────────
    targetType: {
      type: String,
      required: true,
      enum: {
        values: ['product', 'shop', 'seller'],
        message: '{VALUE} is not a valid review target type'
      }
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    // ── Linked order (proves purchase) ──────────────────────────────────────
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },

    // ── Review Content ──────────────────────────────────────────────────────
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5
    },

    title: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ''
    },

    comment: {
      type: String,
      maxlength: 1000,
      default: ''
    },

    images: {
      type: [String],
      validate: {
        validator: function (v) {
          return v.length <= 3;
        },
        message: 'A review can have at most 3 images'
      },
      default: []
    },

    // ── Verification & Engagement ───────────────────────────────────────────
    isVerifiedPurchase: {
      type: Boolean,
      default: false
    },

    helpfulCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
// One review per user per target
reviewSchema.index({ reviewer: 1, targetType: 1, targetId: 1 }, { unique: true });
reviewSchema.index({ targetType: 1, targetId: 1, rating: -1 });
reviewSchema.index({ order: 1 });

module.exports = mongoose.model('Review', reviewSchema);
