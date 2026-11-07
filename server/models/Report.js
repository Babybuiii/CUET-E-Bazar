const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    // ── Reporter ────────────────────────────────────────────────────────────
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // ── What is being reported (polymorphic) ────────────────────────────────
    targetType: {
      type: String,
      required: true,
      enum: {
        values: ['product', 'shop', 'user', 'giveaway'],
        message: '{VALUE} is not a valid report target type'
      }
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    // ── Report Details ──────────────────────────────────────────────────────
    reason: {
      type: String,
      required: true,
      enum: {
        values: ['scam', 'fake_product', 'harassment', 'inappropriate_content', 'price_gouging', 'spam', 'other'],
        message: '{VALUE} is not a valid report reason'
      }
    },

    description: {
      type: String,
      required: [true, 'Please describe the issue'],
      maxlength: 2000
    },

    evidence: {
      type: [String],
      validate: {
        validator: function (v) {
          return v.length <= 5;
        },
        message: 'You can attach at most 5 evidence images'
      },
      default: []
    },

    // ── Admin Resolution ────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'under_review', 'resolved', 'dismissed'],
      default: 'pending'
    },

    adminNotes: {
      type: String,
      default: ''
    },

    actionTaken: {
      type: String,
      default: ''
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    resolvedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
reportSchema.index({ status: 1 });
reportSchema.index({ reporter: 1 });
reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
