const mongoose = require('mongoose');

// ── Approved constants ───────────────────────────────────────────────────────
const GIVEAWAY_CATEGORIES = ['Books', 'Electronics', 'Study Materials', 'Accessories', 'Others'];
const GIVEAWAY_CONDITIONS  = ['New', 'Like New', 'Good', 'Fair'];
const GIVEAWAY_LOCATIONS   = [
  'Main Gate',
  'Academic Building',
  'Library',
  'Hall',
  'CUET Campus'
];

// ── Interest Request Sub-Schema (preserved from original) ────────────────────
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

// ── Claim Buffer Applicant Sub-Schema ─────────────────────────────────────────
const claimBufferApplicantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    claimedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

// ── Waitlist Entry Sub-Schema ─────────────────────────────────────────────────
const waitlistEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

// ── Giveaway Schema ───────────────────────────────────────────────────────────
const giveawaySchema = new mongoose.Schema(
  {
    // ── Core Fields (all preserved from original) ──────────────────────────
    title: {
      type: String,
      required: [true, 'Giveaway title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters']
    },

    description: {
      type: String,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },

    category: {
      type: String,
      enum: {
        values: GIVEAWAY_CATEGORIES,
        message: '{VALUE} is not a valid giveaway category'
      },
      default: 'Others'
    },

    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    condition: {
      type: String,
      enum: {
        values: GIVEAWAY_CONDITIONS,
        message: '{VALUE} is not a valid condition'
      },
      default: 'Good'
    },

    // Images stored as simple string URLs (Cloudinary URLs or base64 fallbacks)
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
      enum: {
        values: GIVEAWAY_LOCATIONS,
        message: '{VALUE} is not a valid pickup location'
      },
      default: 'CUET Campus'
    },

    // Optional free-text spot within the pickup location
    pickupSpot: {
      type: String,
      default: '',
      maxlength: 200
    },

    deadline: {
      type: Date,
      required: [true, 'Deadline is required']
    },

    // ── Interest Tracking (preserved from original) ────────────────────────
    interestedUsers: [interestSchema],

    selectedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // ── Status ────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ['available', 'pending_draw', 'claimed', 'expired', 'cancelled'],
        message: '{VALUE} is not a valid giveaway status'
      },
      default: 'available'
    },

    // ── Concurrency Tracking (new) ─────────────────────────────────────────
    claimBufferEndsAt: {
      type: Date,
      default: null
    },

    claimBufferApplicants: [claimBufferApplicantSchema],

    waitlist: [waitlistEntrySchema],

    // ── Pickup & Contact Tracking (new) ───────────────────────────────────
    pickupDeadline: {
      type: Date,
      default: null
    },

    contactInitiatedAt: {
      type: Date,
      default: null
    },

    drawResolvedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
giveawaySchema.index({ donor: 1 });
giveawaySchema.index({ status: 1 });
giveawaySchema.index({ deadline: 1 });
giveawaySchema.index({ status: 1, claimBufferEndsAt: 1 });
giveawaySchema.index({ status: 1, pickupDeadline: 1 });
giveawaySchema.index({ selectedUser: 1 });

// ── Export constants for reuse in controller & middleware ─────────────────────
const Giveaway = mongoose.model('Giveaway', giveawaySchema);

module.exports = Giveaway;
module.exports.GIVEAWAY_CATEGORIES = GIVEAWAY_CATEGORIES;
module.exports.GIVEAWAY_CONDITIONS  = GIVEAWAY_CONDITIONS;
module.exports.GIVEAWAY_LOCATIONS   = GIVEAWAY_LOCATIONS;
