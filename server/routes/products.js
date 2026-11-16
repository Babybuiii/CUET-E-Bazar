const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Product = require('../models/Product');
const User = require('../models/User');
const { upload, cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const { authenticate } = require('../middleware/auth');

// Helper to generate a fast, optimized thumbnail URL from Cloudinary URL
function makeThumbnailUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/c_limit,w_600,q_auto,f_auto/');
  }
  return url;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/products - List all products with filtering & search
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { category, condition, location, search, sort = 'newest', limit = 50, sellerType } = req.query;
    const filter = { status: { $in: ['active', 'available'] } };

    if (sellerType === 'individual') {
      // Strictly individual student sellers: exclude campus shops and giveaways
      filter.shop = null;
      filter.sellerType = { $ne: 'shop' };
      filter.price = { $gt: 0 };
      filter.category = { $nin: ['Giveaway', 'Giveaways'] };
    } else if (sellerType === 'shop') {
      filter.$or = [
        { shop: { $ne: null } },
        { sellerType: 'shop' }
      ];
    }

    if (category && category !== 'All') {
      filter.category = category;
    }
    if (condition) {
      filter.condition = condition;
    }
    if (location) {
      filter.location = location;
    }
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } },
        { category: { $regex: q, $options: 'i' } }
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    if (sort === 'price_desc') sortOption = { price: -1 };
    if (sort === 'popular') sortOption = { viewsCount: -1, averageRating: -1 };

    let products = await Product.find(filter)
      .populate('seller', 'fullName userId rating avatarUrl department hall isVerified role shop')
      .populate('shop', 'shopName slug isVerified rating')
      .sort(sortOption)
      .limit(Number(limit));

    // Secondary enforcement for individual sellers
    if (sellerType === 'individual') {
      products = products.filter((p) => {
        if (p.shop) return false;
        if (p.sellerType === 'shop') return false;
        if (p.seller && (p.seller.role === 'shop_owner' || p.seller.shop)) return false;
        if (Number(p.price) <= 0) return false;
        if (p.category && p.category.toLowerCase().includes('giveaway')) return false;
        return true;
      });
    }

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
// GET /api/products/user/wishlist - Get authenticated user's wishlisted products
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/user/wishlist', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'wishlist',
      populate: [
        { path: 'seller', select: 'fullName userId rating avatarUrl department hall isVerified' },
        { path: 'shop', select: 'shopName slug isVerified rating' }
      ]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Filter out any deleted products
    const validProducts = (user.wishlist || []).filter((p) => p !== null && p !== undefined);

    return res.json({
      success: true,
      count: validProducts.length,
      products: validProducts
    });
  } catch (err) {
    console.error('Fetch wishlist error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch wishlist.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/products/user/wishlist-ids - Get wishlisted IDs array for fast checks
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/user/wishlist-ids', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('wishlist');
    if (!user) {
      return res.json({ success: true, wishlistIds: [] });
    }
    const ids = (user.wishlist || []).map((id) => id.toString());
    return res.json({ success: true, wishlistIds: ids });
  } catch (err) {
    return res.json({ success: true, wishlistIds: [] });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/products/:id/wishlist - Toggle product in user's wishlist
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:id/wishlist', authenticate, async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!Array.isArray(user.wishlist)) {
      user.wishlist = [];
    }

    const existsIndex = user.wishlist.findIndex(
      (id) => id.toString() === productId.toString()
    );

    let isWishlisted = false;
    if (existsIndex > -1) {
      user.wishlist.splice(existsIndex, 1);
      isWishlisted = false;
    } else {
      user.wishlist.unshift(productId);
      isWishlisted = true;
    }

    await user.save();

    return res.json({
      success: true,
      isWishlisted,
      wishlistCount: user.wishlist.length,
      message: isWishlisted ? 'Product saved to wishlist' : 'Product removed from wishlist'
    });
  } catch (err) {
    console.error('Toggle wishlist error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update wishlist.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/products/user/dashboard-analytics - Seller performance analytics
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/user/dashboard-analytics', authenticate, async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user._id })
      .populate('seller', 'fullName userId rating avatarUrl department hall isVerified')
      .populate('shop', 'shopName slug isVerified rating')
      .sort({ createdAt: -1 })
      .lean();

    const productIds = products.map((p) => p._id);

    // Count how many users have wishlisted each product of this seller
    const wishlistAggregation = await User.aggregate([
      { $unwind: '$wishlist' },
      { $match: { wishlist: { $in: productIds } } },
      { $group: { _id: '$wishlist', count: { $sum: 1 } } }
    ]);

    const wishlistMap = {};
    wishlistAggregation.forEach((w) => {
      wishlistMap[w._id.toString()] = w.count;
    });

    let totalViews = 0;
    let totalWishlists = 0;
    let totalRevenue = 0;
    let potentialRevenue = 0;
    let activeCount = 0;
    let soldCount = 0;
    let reservedCount = 0;
    const allUniqueViewers = new Set();

    const productsWithStats = products.map((p) => {
      const views = p.viewsCount || p.views || 0;
      const wishlists = wishlistMap[p._id.toString()] || 0;
      totalViews += views;
      totalWishlists += wishlists;

      let uniqueViews = p.uniqueViewsCount;
      if (typeof uniqueViews !== 'number' || isNaN(uniqueViews)) {
        uniqueViews = Array.isArray(p.uniqueViewers) ? p.uniqueViewers.length : (views > 0 ? 1 : 0);
      }

      if (Array.isArray(p.uniqueViewers) && p.uniqueViewers.length > 0) {
        p.uniqueViewers.forEach((v) => allUniqueViewers.add(v));
      } else if (views > 0) {
        allUniqueViewers.add(`item_${p._id}`);
      }

      const price = Number(p.price) || 0;

      if (p.status === 'sold') {
        soldCount += 1;
        totalRevenue += price;
      } else if (p.status === 'active') {
        activeCount += 1;
        potentialRevenue += price;
      } else if (p.status === 'reserved') {
        reservedCount += 1;
      }

      return {
        ...p,
        viewsCount: views,
        uniqueViewsCount: uniqueViews,
        wishlistCount: wishlists
      };
    });

    const conversionRate =
      products.length > 0
        ? Math.round((soldCount / products.length) * 100)
        : 0;

    const clickToSaveRate =
      totalViews > 0
        ? ((totalWishlists / totalViews) * 100).toFixed(1)
        : '0.0';

    const totalUniqueVisitors =
      allUniqueViewers.size > 0
        ? allUniqueViewers.size
        : totalViews > 0
        ? Math.max(1, Math.ceil(totalViews * 0.75))
        : 0;

    return res.json({
      success: true,
      analytics: {
        totalListings: products.length,
        activeListings: activeCount,
        soldItems: soldCount,
        reservedItems: reservedCount,
        totalRevenue,
        potentialRevenue,
        totalAdClicks: totalViews,
        totalUniqueVisitors,
        totalWishlists,
        conversionRate,
        clickToSaveRate
      },
      products: productsWithStats
    });
  } catch (err) {
    console.error('Fetch dashboard analytics error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate seller analytics.'
    });
  }
});

// Route alias for convenience
router.get('/dashboard-analytics', authenticate, (req, res, next) => {
  req.url = '/user/dashboard-analytics';
  router.handle(req, res, next);
});

// Route alias for my-listings
router.get('/my-listings', authenticate, (req, res, next) => {
  req.url = '/user/my-listings';
  router.handle(req, res, next);
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/products/:id/view - Record ad click and unique user view
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:id/view', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Determine unique viewer identifier
    let viewerId = req.body?.viewerId || req.headers['x-viewer-id'] || null;

    // Check optional bearer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cuet_ebazar_jwt_secret');
        if (decoded && (decoded.id || decoded._id)) {
          viewerId = `user_${decoded.id || decoded._id}`;
        }
      } catch {
        // Fallback to body viewerId or IP
      }
    }

    if (!viewerId) {
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown_client';
      viewerId = `anon_${clientIp.toString().split(',')[0].trim()}`;
    }

    // Increment raw ad click count
    product.viewsCount = (product.viewsCount || 0) + 1;

    // Track unique viewers
    if (!Array.isArray(product.uniqueViewers)) {
      product.uniqueViewers = [];
    }

    if (viewerId && !product.uniqueViewers.includes(viewerId)) {
      product.uniqueViewers.push(viewerId);
    }

    product.uniqueViewsCount = product.uniqueViewers.length;
    await product.save();

    return res.json({
      success: true,
      viewsCount: product.viewsCount,
      uniqueViewsCount: product.uniqueViewsCount
    });
  } catch (err) {
    console.error('Record click error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record click.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/products/:id - Get single product (idempotent read)
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'fullName userId rating avatarUrl department hall isVerified contactNumber email')
      .populate('shop', 'shopName slug category location rating operatingHours isVerified');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

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

    const coverIdx = Number(req.body.coverIndex) || 0;
    if (coverIdx > 0 && coverIdx < images.length) {
      const coverItem = images.splice(coverIdx, 1)[0];
      images.unshift(coverItem);
    }
    if (images.length > 0) {
      images.forEach((img, i) => {
        img.isCover = i === 0;
      });
    }

    // ── 4. Create Product in MongoDB ──
    const isShopListing = Boolean(req.user.shop || req.user.role === 'shop_owner');
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
      sellerType: isShopListing ? 'shop' : 'individual',
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
// PUT /api/products/:id - Edit listing (title, price, photos, cover photo, etc.)
// ═══════════════════════════════════════════════════════════════════════════════
router.put('/:id', authenticate, upload.array('newImages', 8), async (req, res) => {
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
      isNegotiable,
      coverIndex,
      existingImages
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
    if (tags !== undefined) {
      let parsedTags = tags;
      if (typeof tags === 'string') {
        try {
          parsedTags = JSON.parse(tags);
        } catch {
          parsedTags = tags.split(',').map((t) => t.trim());
        }
      }
      if (Array.isArray(parsedTags)) {
        product.tags = parsedTags.filter(Boolean).map((t) => String(t).trim());
      }
    }
    if (isNegotiable !== undefined) {
      product.isNegotiable = isNegotiable === true || isNegotiable === 'true';
    }

    // ── Photo Updates (Add new photos, remove photos, reorder cover photo) ──
    let updatedImages = null;
    if (existingImages !== undefined) {
      try {
        updatedImages = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
      } catch (e) {
        updatedImages = [...product.images];
      }
    } else {
      updatedImages = [...product.images];
    }

    // Upload new files if provided
    if (req.files && req.files.length > 0) {
      let newlyUploaded = [];
      if (isCloudinaryConfigured) {
        newlyUploaded = req.files.map((file) => {
          const fullUrl = file.path || file.secure_url || file.url || '';
          return {
            url: fullUrl,
            thumbnailUrl: makeThumbnailUrl(fullUrl),
            publicId: file.filename || file.public_id || `ebazar-${Date.now()}`
          };
        });
      } else {
        newlyUploaded = req.files.map((file, idx) => {
          const base64Data = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
          return {
            url: base64Data,
            thumbnailUrl: base64Data,
            publicId: `local-buffer-${Date.now()}-${idx}`
          };
        });
      }
      updatedImages = [...updatedImages, ...newlyUploaded];
    }

    if (existingImages !== undefined || (req.files && req.files.length > 0) || coverIndex !== undefined) {
      if (updatedImages.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'A product listing must have at least 3 photos. Please keep 3 or more photos.'
        });
      }
      if (updatedImages.length > 8) {
        return res.status(400).json({
          success: false,
          message: 'A product listing can have at most 8 photos.'
        });
      }

      // Reorder cover photo to index 0
      const cIdx = Number(coverIndex) || 0;
      if (cIdx > 0 && cIdx < updatedImages.length) {
        const [chosenCover] = updatedImages.splice(cIdx, 1);
        updatedImages.unshift(chosenCover);
      }

      updatedImages.forEach((img, i) => {
        img.isCover = i === 0;
      });

      product.images = updatedImages;
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
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(' | ') });
    }
    return res.status(500).json({ success: false, message: 'Server error while updating listing.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/products/:id/cover - Quick cover photo selection
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/cover', authenticate, async (req, res) => {
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

    const { coverIndex, publicId, url } = req.body;
    let targetIdx = -1;

    if (coverIndex !== undefined && Number(coverIndex) >= 0 && Number(coverIndex) < product.images.length) {
      targetIdx = Number(coverIndex);
    } else if (publicId) {
      targetIdx = product.images.findIndex((img) => img.publicId === publicId);
    } else if (url) {
      targetIdx = product.images.findIndex((img) => img.url === url || img.thumbnailUrl === url);
    }

    if (targetIdx > 0 && targetIdx < product.images.length) {
      const [chosenCover] = product.images.splice(targetIdx, 1);
      product.images.unshift(chosenCover);
    }

    product.images.forEach((img, i) => {
      img.isCover = i === 0;
    });

    await product.save();

    const populatedProduct = await Product.findById(product._id)
      .populate('seller', 'fullName userId rating avatarUrl department hall isVerified')
      .populate('shop', 'shopName slug isVerified rating');

    return res.json({
      success: true,
      message: 'Cover photo updated successfully!',
      product: populatedProduct
    });
  } catch (err) {
    console.error('Update cover error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update cover photo.' });
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
    await product.save();

    // Recalculate seller's accurate totalProductsSold from current database listings
    const actualSold = await Product.countDocuments({ seller: product.seller, status: 'sold' });
    const sellerUser = await User.findById(product.seller);
    if (sellerUser) {
      sellerUser.totalProductsSold = actualSold;
      await sellerUser.save();
    }

    return res.json({
      success: true,
      message: `Listing marked as ${status}!`,
      product,
      totalProductsSold: actualSold
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

    // Recalculate seller's totalProductsSold
    const actualSold = await Product.countDocuments({ seller: product.seller, status: 'sold' });
    await User.findByIdAndUpdate(product.seller, { totalProductsSold: actualSold });

    return res.json({
      success: true,
      message: 'Product and associated images deleted successfully.',
      totalProductsSold: actualSold
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete product.' });
  }
});

module.exports = router;
