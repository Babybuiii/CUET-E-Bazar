const mongoose = require('mongoose');

// ── CUET Constants ─────────────────────────────────────────────────────────────
const CUET_DEPARTMENTS = [
  'Civil Engineering',
  'Water Resources Engineering',
  'Mechanical Engineering',
  'Petroleum and Mining Engineering',
  'Mechatronics & Industrial Engineering',
  'Materials and Metallurgical Engineering',
  'Electrical and Electronic Engineering',
  'Computer Science & Engineering',
  'Electronics & Telecommunication Engineering',
  'Biomedical Engineering',
  'Architecture',
  'Urban and Regional Planning'
];

const CUET_HALLS = [
  'Dr. Qudrat-E-Khuda Hall',
  'Kabi Kazi Nazrul Islam Hall',
  'Muktijoddha Hall',
  'Shaheed Abu Sayed Hall',
  'Shahid Mohammad Shah Hall',
  'Shaheed Tareq Huda Hall',
  'Sufia Kamal Hall',
  'Shamsennahar Khan Hall',
  'Tapashi Rabeya Hall'
];


// ── Warning Sub-Schema ─────────────────────────────────────────────────────────
const warningSchema = new mongoose.Schema(
  {
    reason: { type: String, required: true },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now }
  },
  { _id: false }
);

// ── User Schema ────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    // ── Auto-generated unique user ID (CUET-USR-00001) ──
    userId: {
      type: String,
      unique: true
    },

    // ── Signup credentials (user provides) ──────────────────────────────────
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters']
    },

    studentId: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (this.role === 'student' || v) {
            return /^\d{7}$/.test(v);
          }
          return true;
        },
        message: 'Student ID must be exactly 7 digits (e.g. 2204120)'
      }
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          if (this.role === 'student') {
            return /^[^\s@]+@[^\s@]*cuet\.ac\.bd$/i.test(v);
          }
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Students must use a valid CUET email ending with .cuet.ac.bd'
      }
    },

    department: {
      type: String,
      enum: {
        values: [...CUET_DEPARTMENTS, ''],
        message: '{VALUE} is not a valid CUET department'
      },
      default: ''
    },

    hall: {
      type: String,
      enum: {
        values: [...CUET_HALLS, ''],
        message: '{VALUE} is not a valid CUET hall'
      },
      default: ''
    },

    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      default: null
    },

    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      validate: {
        validator: function (v) {
          return /^(\+?880|0)1[3-9]\d{8}$/.test(v);
        },
        message: 'Please provide a valid Bangladeshi phone number'
      }
    },

    firebaseUid: {
      type: String,
      sparse: true,
      index: true
    },

    passwordHash: {
      type: String,
      default: ''
    },

    // ── Role ────────────────────────────────────────────────────────────────
    role: {
      type: String,
      enum: {
        values: ['student', 'shop_owner', 'admin'],
        message: '{VALUE} is not a valid role'
      },
      default: 'student'
    },

    // ── Profile ─────────────────────────────────────────────────────────────
    avatarUrl: {
      type: String,
      default: ''
    },

    bio: {
      type: String,
      maxlength: 300,
      default: ''
    },

    // ── Seller / Activity Statistics ────────────────────────────────────────
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },

    totalReviewsReceived: {
      type: Number,
      default: 0
    },

    totalProductsSold: {
      type: Number,
      default: 0
    },

    totalProductsBought: {
      type: Number,
      default: 0
    },

    totalGiveaways: {
      type: Number,
      default: 0
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

    banReason: {
      type: String,
      default: ''
    },

    isSuspended: {
      type: Boolean,
      default: false
    },

    suspendedUntil: {
      type: Date,
      default: null
    },

    suspensionReason: {
      type: String,
      default: ''
    },

    warnings: [warningSchema],

    // ── Wishlist ─────────────────────────────────────────────────────────────
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      }
    ],

    // ── Activity Tracking ───────────────────────────────────────────────────
    lastActive: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// ── Auto-generate userId before save ────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.userId) {
    const count = await mongoose.model('User').countDocuments();
    this.userId = `CUET-USR-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// ── Indexes ─────────────────────────────────────────────────────────────────
// Student IDs stay unique, but only among documents that actually have one.
// A plain unique index would treat every shop owner's missing studentId as null
// and reject the second one with an E11000 duplicate key error.
userSchema.index(
  { studentId: 1 },
  { unique: true, partialFilterExpression: { studentId: { $type: 'string' } } }
);

userSchema.index({ department: 1 });
userSchema.index({ role: 1 });
userSchema.index({ rating: -1 });
userSchema.index({ isBanned: 1 });

// ── Export constants alongside model for reuse ──────────────────────────────
const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.CUET_DEPARTMENTS = CUET_DEPARTMENTS;
module.exports.CUET_HALLS = CUET_HALLS;
