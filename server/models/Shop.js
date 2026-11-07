const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema(
  {
    // ── Identity ────────────────────────────────────────────────────────────
    shopName: {
      type: String,
      required: [true, 'Shop name is required'],
      unique: true,
      trim: true,
      maxlength: 80
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // ── Details ─────────────────────────────────────────────────────────────
    category: {
      type: String,
      default: 'General Store'
    },

    description: {
      type: String,
      default: '',
      maxlength: 1000
    },

    bannerUrl: {
      type: String,
      default: ''
    },

    logoUrl: {
      type: String,
      default: ''
    },

    // ── Contact ─────────────────────────────────────────────────────────────
    contactNumber: {
      type: String,
      default: ''
    },

    email: {
      type: String,
      lowercase: true,
      default: ''
    },

    location: {
      type: String,
      default: 'CUET Campus'
    },

    operatingHours: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '21:00' }
    },

    // ── Verification & Moderation ───────────────────────────────────────────
    isVerified: {
      type: Boolean,
      default: false
    },

    isBanned: {
      type: Boolean,
      default: false
    },

    // ── Availability ──────────────────────────────────────────────────────────────────────
    isOpen: {
      type: Boolean,
      default: true
    },

    // ── Analytics ───────────────────────────────────────────────────────────
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },

    totalReviews: {
      type: Number,
      default: 0
    },

    totalProducts: {
      type: Number,
      default: 0
    },

    totalSales: {
      type: Number,
      default: 0
    },

    totalRevenue: {
      type: Number,
      default: 0
    },

    // ── Social ──────────────────────────────────────────────────────────────
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  { timestamps: true }
);

// ── Auto-generate slug from shopName before save ────────────────────────────
shopSchema.pre('save', function (next) {
  if (this.isModified('shopName') || !this.slug) {
    this.slug = this.shopName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// ── Indexes ─────────────────────────────────────────────────────────────────
// One shop per owner. User emails are already unique, so this is what enforces
// "one shop per email" at the database level.
shopSchema.index({ owner: 1 }, { unique: true });
shopSchema.index({ category: 1 });
shopSchema.index({ rating: -1 });

module.exports = mongoose.model('Shop', shopSchema);
