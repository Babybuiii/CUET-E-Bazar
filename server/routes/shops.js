const express = require('express');
const router = express.Router();
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { uploadShopImages, isCloudinaryConfigured, cloudinary } = require('../config/cloudinary');

// Keep in sync with SHOP_CATEGORIES in src/app/(auth)/signup/page.tsx
const SHOP_CATEGORIES = [
  'General Store & Grocery',
  'Stationery & Photocopy',
  'Electronics & Accessories',
  'Food, Snacks & Cafeteria',
  'Clothing & Tailoring',
  'Books & Academic Resources',
  'Pharmacy & Personal Care',
  'Gadget Repair & Services',
  'Others'
];

// ── Helper: shape a shop for API responses ──────────────────────────────────
const formatShop = (shop, owner = null) => ({
  _id: shop._id,
  shopName: shop.shopName,
  slug: shop.slug,
  category: shop.category,
  description: shop.description,
  bannerUrl: shop.bannerUrl,
  logoUrl: shop.logoUrl,
  contactNumber: shop.contactNumber,
  email: shop.email,
  location: shop.location,
  operatingHours: shop.operatingHours,
  isVerified: shop.isVerified,
  isBanned: shop.isBanned,
  rating: shop.rating,
  totalReviews: shop.totalReviews,
  totalProducts: shop.totalProducts,
  totalSales: shop.totalSales,
  followersCount: Array.isArray(shop.followers) ? shop.followers.length : 0,
  owner: owner || shop.owner || null,
  createdAt: shop.createdAt
});

// ── Helper: resolve a shop by mongo id or slug ──────────────────────────────
const findShopByIdOrSlug = async (idOrSlug) => {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
  const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() };
  return Shop.findOne(query).populate('owner', 'fullName userId avatarUrl rating isVerified');
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/shops - Public directory of campus shops
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { category, search, sort = 'newest', limit = 50 } = req.query;
    const filter = { isBanned: false };

    if (category && category !== 'All') {
      filter.category = category;
    }
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { shopName: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } }
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'rating') sortOption = { rating: -1 };
    if (sort === 'products') sortOption = { totalProducts: -1 };
    if (sort === 'name') sortOption = { shopName: 1 };

    const shops = await Shop.find(filter)
      .populate('owner', 'fullName userId avatarUrl isVerified')
      .sort(sortOption)
      .limit(Number(limit));

    // Live product counts so the directory never shows a stale number
    const counts = await Product.aggregate([
      { $match: { shop: { $in: shops.map((s) => s._id) }, status: 'active' } },
      { $group: { _id: '$shop', count: { $sum: 1 } } }
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

    return res.json({
      success: true,
      count: shops.length,
      shops: shops.map((shop) => ({
        ...formatShop(shop),
        activeProducts: countMap.get(String(shop._id)) || 0
      }))
    });
  } catch (err) {
    console.error('Fetch shops error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch shops.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/shops/categories - Category list for filters and forms
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/categories', (req, res) => {
  return res.json({ success: true, categories: SHOP_CATEGORIES });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/shops/my-shop - Owner's own shop plus live performance overview
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/my-shop', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'shop_owner') {
      return res.status(403).json({
        success: false,
        message: 'Only shop owner accounts have a shop overview.'
      });
    }

    const shop = await Shop.findOne({ owner: req.user._id }).populate(
      'owner',
      'fullName userId avatarUrl rating isVerified'
    );

    if (!shop) {
      return res.status(404).json({
        success: false,
        needsShopSetup: true,
        message: 'No shop is linked to this account yet.'
      });
    }

    const found = await Product.find({ shop: shop._id })
      .sort({ createdAt: -1 })
      .select('title price originalPrice discount category condition status images viewsCount stock createdAt')
      .lean();

    // wishlistCount is not stored on Product - it is derived from User.wishlist
    const wishlistAggregation = await User.aggregate([
      { $unwind: '$wishlist' },
      { $match: { wishlist: { $in: found.map((p) => p._id) } } },
      { $group: { _id: '$wishlist', count: { $sum: 1 } } }
    ]);
    const wishlistMap = new Map(wishlistAggregation.map((w) => [String(w._id), w.count]));

    const products = found.map((p) => ({
      ...p,
      wishlistCount: wishlistMap.get(String(p._id)) || 0
    }));

    const active = products.filter((p) => p.status === 'active');
    const sold = products.filter((p) => p.status === 'sold');
    const reserved = products.filter((p) => p.status === 'reserved');

    const totalViews = products.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
    const totalWishlisted = products.reduce((sum, p) => sum + (p.wishlistCount || 0), 0);
    const inventoryValue = active.reduce((sum, p) => sum + (p.price || 0), 0);
    const revenue = sold.reduce((sum, p) => sum + (p.price || 0), 0);

    // Which categories this shop actually sells in, biggest first
    const categoryMap = new Map();
    for (const p of products) {
      if (p.status !== 'active') continue;
      categoryMap.set(p.category, (categoryMap.get(p.category) || 0) + 1);
    }
    const categoryBreakdown = [...categoryMap.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    return res.json({
      success: true,
      shop: formatShop(shop),
      overview: {
        totalProducts: products.length,
        activeProducts: active.length,
        soldProducts: sold.length,
        reservedProducts: reserved.length,
        totalViews,
        totalWishlisted,
        inventoryValue,
        revenue,
        followersCount: Array.isArray(shop.followers) ? shop.followers.length : 0,
        rating: shop.rating,
        totalReviews: shop.totalReviews
      },
      categoryBreakdown,
      topProducts: [...products]
        .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))
        .slice(0, 5),
      recentProducts: products.slice(0, 8),
      products
    });
  } catch (err) {
    console.error('My shop error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load your shop overview.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/shops/my-shop - Update the owner's shop details
// ═══════════════════════════════════════════════════════════════════════════════
router.put('/my-shop', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'shop_owner') {
      return res.status(403).json({
        success: false,
        message: 'Only shop owner accounts can edit shop details.'
      });
    }

    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'No shop is linked to this account yet.' });
    }

    const {
      shopName,
      category,
      description,
      location,
      contactNumber,
      email,
      logoUrl,
      bannerUrl,
      operatingHours
    } = req.body;

    // Shop names are unique across campus, so guard before renaming
    if (shopName && shopName.trim() && shopName.trim() !== shop.shopName) {
      const clash = await Shop.findOne({
        _id: { $ne: shop._id },
        shopName: { $regex: new RegExp(`^${shopName.trim()}$`, 'i') }
      });
      if (clash) {
        return res.status(400).json({
          success: false,
          message: 'A shop with this name already exists. Please choose a different name.'
        });
      }
      shop.shopName = shopName.trim();
    }

    if (category !== undefined) shop.category = category;
    if (description !== undefined) shop.description = description;
    if (location !== undefined) shop.location = location;
    if (contactNumber !== undefined) shop.contactNumber = contactNumber;
    if (email !== undefined) shop.email = email;
    if (logoUrl !== undefined) shop.logoUrl = logoUrl;
    if (bannerUrl !== undefined) shop.bannerUrl = bannerUrl;
    if (operatingHours && typeof operatingHours === 'object') {
      shop.operatingHours = {
        open: operatingHours.open || shop.operatingHours?.open || '09:00',
        close: operatingHours.close || shop.operatingHours?.close || '21:00'
      };
    }

    await shop.save();

    return res.json({
      success: true,
      message: 'Shop details updated successfully!',
      shop: formatShop(shop)
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(' | ') });
    }
    console.error('Update shop error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update shop details.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/shops/my-shop/images - Upload shop logo and/or cover banner
//   multipart fields: logo, banner (both optional)
// ═══════════════════════════════════════════════════════════════════════════════
router.post(
  '/my-shop/images',
  authenticate,
  (req, res, next) => {
    if (req.user.role !== 'shop_owner') {
      return res.status(403).json({
        success: false,
        message: 'Only shop owner accounts can upload shop images.'
      });
    }
    if (!isCloudinaryConfigured) {
      return res.status(503).json({
        success: false,
        message: 'Image uploads are unavailable - Cloudinary is not configured on the server.'
      });
    }
    next();
  },
  uploadShopImages.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const shop = await Shop.findOne({ owner: req.user._id });
      if (!shop) {
        return res.status(404).json({ success: false, message: 'No shop is linked to this account yet.' });
      }

      const logoFile = req.files?.logo?.[0];
      const bannerFile = req.files?.banner?.[0];

      if (!logoFile && !bannerFile) {
        return res.status(400).json({ success: false, message: 'Attach a logo or a cover photo to upload.' });
      }

      // Clean up the replaced image so the Cloudinary account does not fill up
      const destroy = async (url) => {
        if (!url) return;
        const match = url.match(/\/ebazar\/shops\/(logos|banners)\/([^./]+)\./);
        if (!match) return;
        try {
          await cloudinary.uploader.destroy(`ebazar/shops/${match[1]}/${match[2]}`);
        } catch {
          // A failed cleanup must not fail the upload
        }
      };

      if (logoFile) {
        await destroy(shop.logoUrl);
        shop.logoUrl = logoFile.path;
      }
      if (bannerFile) {
        await destroy(shop.bannerUrl);
        shop.bannerUrl = bannerFile.path;
      }

      await shop.save();

      return res.json({
        success: true,
        message: 'Shop images updated successfully!',
        logoUrl: shop.logoUrl,
        bannerUrl: shop.bannerUrl,
        shop: formatShop(shop)
      });
    } catch (err) {
      console.error('Shop image upload error:', err);
      return res.status(500).json({ success: false, message: 'Failed to upload shop images.' });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/shops/my-shop/images/:kind - Remove the logo or cover photo
// ═══════════════════════════════════════════════════════════════════════════════
router.delete('/my-shop/images/:kind', authenticate, async (req, res) => {
  try {
    const { kind } = req.params;
    if (!['logo', 'banner'].includes(kind)) {
      return res.status(400).json({ success: false, message: 'Image must be "logo" or "banner".' });
    }
    if (req.user.role !== 'shop_owner') {
      return res.status(403).json({ success: false, message: 'Only shop owner accounts can change shop images.' });
    }

    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'No shop is linked to this account yet.' });
    }

    const url = kind === 'logo' ? shop.logoUrl : shop.bannerUrl;
    if (url && isCloudinaryConfigured) {
      const match = url.match(/\/ebazar\/shops\/(logos|banners)\/([^./]+)\./);
      if (match) {
        try {
          await cloudinary.uploader.destroy(`ebazar/shops/${match[1]}/${match[2]}`);
        } catch {
          // Removing the reference matters more than the remote cleanup
        }
      }
    }

    if (kind === 'logo') shop.logoUrl = '';
    else shop.bannerUrl = '';
    await shop.save();

    return res.json({
      success: true,
      message: `Shop ${kind === 'logo' ? 'logo' : 'cover photo'} removed.`,
      shop: formatShop(shop)
    });
  } catch (err) {
    console.error('Shop image delete error:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove shop image.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/shops/:idOrSlug - Public shop page with its product catalogue
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:idOrSlug', async (req, res) => {
  try {
    const shop = await findShopByIdOrSlug(req.params.idOrSlug);
    if (!shop || shop.isBanned) {
      return res.status(404).json({ success: false, message: 'Shop not found.' });
    }

    const found = await Product.find({ shop: shop._id, status: 'active' })
      .populate('seller', 'fullName userId avatarUrl isVerified')
      .sort({ createdAt: -1 })
      .lean();

    // wishlistCount is not stored on Product - it is derived from User.wishlist
    const wishlistAggregation = await User.aggregate([
      { $unwind: '$wishlist' },
      { $match: { wishlist: { $in: found.map((p) => p._id) } } },
      { $group: { _id: '$wishlist', count: { $sum: 1 } } }
    ]);
    const wishlistMap = new Map(wishlistAggregation.map((w) => [String(w._id), w.count]));

    const products = found.map((p) => ({
      ...p,
      wishlistCount: wishlistMap.get(String(p._id)) || 0
    }));

    const categoryMap = new Map();
    for (const p of products) {
      categoryMap.set(p.category, (categoryMap.get(p.category) || 0) + 1);
    }

    return res.json({
      success: true,
      shop: { ...formatShop(shop), activeProducts: products.length },
      categoryBreakdown: [...categoryMap.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      products
    });
  } catch (err) {
    console.error('Fetch shop error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch shop.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/shops/:id/follow - Toggle following a shop
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:id/follow', authenticate, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found.' });
    }

    const userId = String(req.user._id);
    const already = (shop.followers || []).some((f) => String(f) === userId);

    if (already) {
      shop.followers = shop.followers.filter((f) => String(f) !== userId);
    } else {
      shop.followers.push(req.user._id);
    }
    await shop.save();

    return res.json({
      success: true,
      following: !already,
      followersCount: shop.followers.length
    });
  } catch (err) {
    console.error('Follow shop error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update follow status.' });
  }
});

module.exports = router;
module.exports.SHOP_CATEGORIES = SHOP_CATEGORIES;
