const mongoose = require('mongoose');

// ── Interest Request Sub-Schema ─────────────────────────────────────────────
const interestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      default: '',
      maxlength: 500
    },
    requestedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

// ── Giveaway Schema ─────────────────────────────────────────────────────────
const giveawaySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Giveaway title is required'],
      trim: true,
      maxlength: 120
    },

    description: {
      type: String,
      default: '',
      maxlength: 1000
    },

    category: {
      type: String,
      default: 'Others'
    },

    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    condition: {
      type: String,
      enum: ['New', 'Like New', 'Good', 'Fair'],
      default: 'Good'
    },

    images: {
      type: [String],
      validate: {
        validator: function (v) {
          return v.length <= 5;
        },
        message: 'A giveaway can have at most 5 images'
      },
      default: []
    },

    location: {
      type: String,
      default: 'CUET Campus'
    },

    deadline: {
      type: Date,
      required: [true, 'Deadline is required']
    },

    // ── Interest Tracking ───────────────────────────────────────────────────
    interestedUsers: [interestSchema],

    selectedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // ── Status ──────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['available', 'claimed', 'expired', 'cancelled'],
      default: 'available'
    }
  },
  { timestamps: true }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
giveawaySchema.index({ donor: 1 });
giveawaySchema.index({ status: 1 });
giveawaySchema.index({ deadline: 1 });

module.exports = mongoose.model('Giveaway', giveawaySchema);
