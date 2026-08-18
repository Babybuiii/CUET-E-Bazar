const mongoose = require('mongoose');

// ── Answer Sub-Schema ───────────────────────────────────────────────────────
const answerSchema = new mongoose.Schema(
  {
    answerer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: [true, 'Answer text is required'],
      maxlength: 1000
    },
    isSellerAnswer: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

// ── Query Schema (Public Q&A on Products) ───────────────────────────────────
const querySchema = new mongoose.Schema(
  {
    asker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },

    question: {
      type: String,
      required: [true, 'Question is required'],
      maxlength: 500
    },

    answers: [answerSchema],

    isResolved: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
querySchema.index({ product: 1, createdAt: -1 });
querySchema.index({ asker: 1 });

module.exports = mongoose.model('Query', querySchema);
