const mongoose = require('mongoose');

// ── Product Categories ──────────────────────────────────────────────────────
const PRODUCT_CATEGORIES = [
  'Electronics & Gadgets',
  'Books & Study Material',
  'Drawing & Lab Instruments',
  'Furniture & Dorm Essentials',
  'Bicycles & Sports',
  'Clothing & Accessories',
  'Others'
];

// ── Product Schema ──────────────────────────────────────────────────────────
const productSchema = new mongoose.Schema(
  {
    // ── Core Fields ─────────────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      maxlength: 120
    },

    description: {
      type: String,
      default: '',
      maxlength: 2000
    },

    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },

    originalPrice: {
      type: Number,
      min: 0,
      default: null
    },

    discount: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    // ── Classification ──────────────────────────────────────────────────────
    category: {
      type: String,
      required: true,
      enum: {
        values: PRODUCT_CATEGORIES,
        message: '{VALUE} is not a valid product category'
      },
      default: 'Electronics & Gadgets'
    },

    condition: {
      type: String,
      enum: ['New', 'Like New', 'Used - Good', 'Used - Fair'],
      default: 'Used - Good'
    },

    tags: [
      {
        type: String,
        trim: true
      }
    ],

    // ── Media ─────────────────────────────────────────────────────────────────
    // Each image stored as an object:
    //   url         → full-resolution Cloudinary URL (for product detail page)
    //   thumbnailUrl → auto-generated 400×400 thumbnail URL (for cards/homepage)
    //   publicId    → Cloudinary public_id (needed for deletion)
    images: {
      type: [
        {
          url: { type: String, required: true },          // e.g. https://res.cloudinary.com/.../v1/.../image.jpg
          thumbnailUrl: { type: String, required: true }, // e.g. same URL with /c_fill,w_400,h_400/ transform
          publicId: { type: String, required: true }      // e.g. ebazar/products/abc123
        }
      ],
      validate: [
        {
          validator: function (v) {
            return v.length >= 3;
          },
          message: 'A product listing must have at least 3 photos'
        },
        {
          validator: function (v) {
            return v.length <= 8;
          },
          message: 'A product can have at most 8 photos'
        }
      ],
      default: []
    },

    // ── Seller Info ─────────────────────────────────────────────────────────
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      default: null
    },

    sellerType: {
      type: String,
      enum: ['individual', 'shop'],
      default: 'individual'
    },

    // ── Inventory (for shop products) ───────────────────────────────────────
    stock: {
      type: Number,
      default: 1,
      min: 0
    },

    sizes: {
      type: [String],
      default: []
    },

    // ── Status & Location ───────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'sold', 'reserved', 'removed_by_admin'],
      default: 'active'
    },

    location: {
      type: String,
      default: 'CUET Campus'
    },

    // ── Analytics ───────────────────────────────────────────────────────────
    viewsCount: {
      type: Number,
      default: 0
    },

    queryCount: {
      type: Number,
      default: 0
    },

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },

    totalReviews: {
      type: Number,
      default: 0
    },

    // ── Admin Moderation ────────────────────────────────────────────────────
    isFlagged: {
      type: Boolean,
      default: false
    },

    flagReason: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
productSchema.index({ seller: 1, status: 1 });
productSchema.index({ shop: 1, status: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ averageRating: -1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
module.exports.PRODUCT_CATEGORIES = PRODUCT_CATEGORIES;
