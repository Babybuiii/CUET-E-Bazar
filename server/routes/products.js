const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { upload, cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const { authenticate } = require('../middleware/auth');

// Helper to generate a 400x400 fast thumbnail URL from Cloudinary URL
function makeThumbnailUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/c_fill,w_400,h_400,q_auto,f_auto/');
  }
  return url;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/products - List all products with filtering & search
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { category, condition, location, search, sort = 'newest', limit = 50 } = req.query;
    const filter = { status: { $in: ['active', 'available'] } };

    if (category && category !== 'All') {
      filter.category = category;
    }
    if (condition) {
      filter.condition = condition;
    }
    if (location) {
      filter.location = location;
    }
    if (search) {
      filter.$text = { $search: search };
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    if (sort === 'price_desc') sortOption = { price: -1 };
    if (sort === 'popular') sortOption = { viewsCount: -1, averageRating: -1 };

    const products = await Product.find(filter)
      .populate('seller', 'fullName userId rating avatarUrl department hall isVerified')
      .populate('shop', 'shopName slug isVerified rating')
      .sort(sortOption)
      .limit(Number(limit));

    return res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (err) {
    console.error('Fetch products error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/products/user/my-listings - List authenticated user's own products
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/user/my-listings', authenticate, async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user._id })
      .populate('seller', 'fullName userId rating avatarUrl department hall isVerified')
      .populate('shop', 'shopName slug isVerified rating')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (err) {
    console.error('Fetch my-listings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch your listings.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/products/:id - Get single product
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'fullName userId rating avatarUrl department hall isVerified contactNumber email')
      .populate('shop', 'shopName slug category location rating operatingHours isVerified');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Increment views
    product.views = (product.views || 0) + 1;
    await product.save();

    return res.json({ success: true, product });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch product details.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/products - Create product listing with at least 3 photos
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/', authenticate, upload.array('images', 8), async (req, res) => {
  try {
    const {
      title,
      description = '',
      price,
      category = 'Electronics & Gadgets',
      condition = 'Used - Good',
      location = 'CUET Campus',
      department = '',
      isNegotiable = 'false'
    } = req.body;

    // ── 1. Validate required fields ──
    if (!title || !price) {
      return res.status(400).json({
        success: false,
        message: 'Product title and price are required.'
      });
    }

    // ── 2. Enforce minimum 3 photos ──
    if (!req.files || req.files.length < 3) {
      // Clean up any uploaded Cloudinary files if below minimum
      if (isCloudinaryConfigured && req.files && req.files.length > 0) {
        await Promise.all(
          req.files.map((file) => {
            const publicId = file.filename || file.public_id;
            return publicId ? cloudinary.uploader.destroy(publicId) : Promise.resolve();
          })
        );
      }

      return res.status(400).json({
        success: false,
        message: 'A product listing must have at least 3 photos. Please upload 3 or more photos.'
      });
    }

    // ── 3. Build structured images array ──
    let images = [];

    if (isCloudinaryConfigured) {
      images = req.files.map((file) => {
        const fullUrl = file.path || file.secure_url || file.url || '';
        return {
          url: fullUrl,
          thumbnailUrl: makeThumbnailUrl(fullUrl),
          publicId: file.filename || file.public_id || `ebazar-${Date.now()}`
        };
      });
    } else {
      // Fallback if Cloudinary keys are not yet configured in .env
      images = req.files.map((file, idx) => {
        const base64Data = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        return {
          url: base64Data,
          thumbnailUrl: base64Data,
          publicId: `local-buffer-${Date.now()}-${idx}`
        };
      });
    }

    // ── 4. Create Product in MongoDB ──
    const product = await Product.create({
      title: title.trim(),
      description: description.trim(),
      price: Number(price),
      category,
      condition,
      location,
      department: department || req.user.department || '',
      images,
      seller: req.user._id,
      shop: req.user.shop || null,
      isNegotiable: isNegotiable === 'true' || isNegotiable === true
    });

    // Update seller stats
    req.user.totalProductsSold = (req.user.totalProductsSold || 0);
    await req.user.save();

    const populatedProduct = await Product.findById(product._id)
      .populate('seller', 'fullName userId rating avatarUrl department hall isVerified');

    return res.status(201).json({
      success: true,
      message: 'Product listed successfully with 3+ verified photos!',
      product: populatedProduct
    });
  } catch (err) {
    console.error('Create product error:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(' | ') });
    }
    return res.status(500).json({ success: false, message: 'Server error while creating product listing.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/products/:id - Edit listing (title, price, discount, tags, etc.)
// ═══════════════════════════════════════════════════════════════════════════════
router.put('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const isOwner = product.seller.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'You are not authorized to edit this listing.' });
    }

    const {
      title,
      description,
      price,
      originalPrice,
      discount,
      category,
      condition,
      location,
      status,
      tags,
      isNegotiable
    } = req.body;

    if (title !== undefined) product.title = title.trim();
    if (description !== undefined) product.description = description.trim();
    if (price !== undefined) product.price = Number(price);
    if (originalPrice !== undefined) product.originalPrice = originalPrice ? Number(originalPrice) : null;
    if (discount !== undefined) product.discount = Number(discount);
    if (category !== undefined) product.category = category;
    if (condition !== undefined) product.condition = condition;
    if (location !== undefined) product.location = location;
    if (status !== undefined && ['active', 'sold', 'reserved', 'removed_by_admin'].includes(status)) {
      product.status = status;
    }
    if (tags !== undefined && Array.isArray(tags)) {
      product.tags = tags.filter(Boolean).map((t) => t.trim());
    }
    if (isNegotiable !== undefined) {
      product.isNegotiable = isNegotiable === true || isNegotiable === 'true';
    }

    await product.save();

    const populatedProduct = await Product.findById(product._id)
      .populate('seller', 'fullName userId rating avatarUrl department hall isVerified')
      .populate('shop', 'shopName slug isVerified rating');

    return res.json({
      success: true,
      message: 'Product listing updated successfully!',
      product: populatedProduct
    });
  } catch (err) {
    console.error('Update product error:', err);
    return res.status(500).json({ success: false, message: 'Server error while updating listing.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/products/:id/status - Quick status toggle (active, sold, reserved)
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'sold', 'reserved', 'removed_by_admin'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const isOwner = product.seller.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to change this product status.' });
    }

    product.status = status;
    if (status === 'sold') {
      req.user.totalProductsSold = (req.user.totalProductsSold || 0) + 1;
      await req.user.save();
    }

    await product.save();

    return res.json({
      success: true,
      message: `Listing marked as ${status}!`,
      product
    });
  } catch (err) {
    console.error('Update product status error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update product status.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/products/:id - Delete product and remove images from Cloudinary
// ═══════════════════════════════════════════════════════════════════════════════
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Only seller or admin can delete
    const isOwner = product.seller.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'You are not authorized to delete this product.' });
    }

    // Clean up Cloudinary storage
    if (isCloudinaryConfigured && product.images && product.images.length > 0) {
      await Promise.all(
        product.images.map((img) => {
          if (img.publicId && !img.publicId.startsWith('local-')) {
            return cloudinary.uploader.destroy(img.publicId);
          }
          return Promise.resolve();
        })
      );
    }

    await product.deleteOne();
    return res.json({ success: true, message: 'Product and associated images deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete product.' });
  }
});

module.exports = router;
