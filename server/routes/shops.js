const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
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
  const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug) && /^[0-9a-fA-F]{24}$/.test(idOrSlug);
  const query = isObjectId ? { _id: idOrSlug } : { slug: String(idOrSlug).toLowerCase() };
  return Shop.findOne(query).populate('owner', 'fullName email contactNumber avatarUrl department hall isVerified rating userId');
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/shops - Public directory of campus shops with search, filter & count
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { category, search, sort = 'newest', limit = 50 } = req.query;
    const filter = { isBanned: { $ne: true } };

    if (category && category !== 'All') {
      filter.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { shopName: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } }
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'rating') sortOption = { rating: -1 };
    if (sort === 'name') sortOption = { shopName: 1 };

    const shops = await Shop.find(filter)
      .populate('owner', 'fullName email contactNumber avatarUrl department hall isVerified rating userId')
      .sort(sortOption)
      .limit(Number(limit) || 50)
      .lean();

    // Attach accurate live product counts for each shop
    const shopIds = shops.map((s) => s._id);
    const countAgg = await Product.aggregate([
      { $match: { shop: { $in: shopIds }, status: 'active' } },
      { $group: { _id: '$shop', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    countAgg.forEach((c) => {
      countMap[c._id.toString()] = c.count;
    });

    const enrichedShops = shops.map((s) => ({
      ...s,
      followersCount: Array.isArray(s.followers) ? s.followers.length : 0,
      activeProductsCount: countMap[s._id.toString()] || 0,
      totalProducts: countMap[s._id.toString()] || s.totalProducts || 0
    }));

    return res.json({
      success: true,
      count: enrichedShops.length,
      shops: enrichedShops
    });
  } catch (err) {
    console.error('Fetch shops error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch campus shops.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/shops/mine - The signed-in shop owner's own shop
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/mine', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'shop_owner') {
      return res.status(403).json({ success: false, message: 'Only shop owner accounts can access their shop dashboard.' });
    }

    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'No shop is linked to this account yet.' });
    }

    const activeProducts = await Product.countDocuments({ shop: shop._id, status: 'active' });

    return res.json({
      success: true,
      shop: { ...formatShop(shop, req.user), activeProducts }
    });
  } catch (err) {
    console.error('Fetch my-shop error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load shop details.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/shops/mine - Update shop profile (name, hours, contact, etc.)
// ═══════════════════════════════════════════════════════════════════════════════
router.put('/mine', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'shop_owner') {
      return res.status(403).json({ success: false, message: 'Only shop owner accounts can update shop details.' });
    }

    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'No shop is linked to this account yet.' });
    }

    const allowed = [
      'shopName',
      'description',
      'category',
      'location',
      'operatingHours',
      'contactNumber',
      'email'
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        shop[key] = typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key];
      }
    }

    await shop.save();

    return res.json({
      success: true,
      message: 'Shop details updated successfully.',
      shop: formatShop(shop, req.user)
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(' | ') });
    }
    console.error('Update shop error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update shop.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/shops/mine/images - Upload/replace shop logo or cover photo
// ═══════════════════════════════════════════════════════════════════════════════
router.post(
  '/mine/images',
  authenticate,
  uploadShopImages.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      if (req.user.role !== 'shop_owner') {
        return res.status(403).json({ success: false, message: 'Only shop owner accounts can upload shop images.' });
      }

      const shop = await Shop.findOne({ owner: req.user._id });
      if (!shop) {
        return res.status(404).json({ success: false, message: 'No shop is linked to this account yet.' });
      }

      const files = req.files || {};
      const logoFile = files.logo?.[0];
      const bannerFile = files.banner?.[0];

      if (!logoFile && !bannerFile) {
        return res.status(400).json({ success: false, message: 'No logo or banner image was uploaded.' });
      }

      if (logoFile) {
        shop.logoUrl = isCloudinaryConfigured
          ? logoFile.path
          : `data:${logoFile.mimetype};base64,${logoFile.buffer.toString('base64')}`;
      }

      if (bannerFile) {
        shop.bannerUrl = isCloudinaryConfigured
          ? bannerFile.path
          : `data:${bannerFile.mimetype};base64,${bannerFile.buffer.toString('base64')}`;
      }

      await shop.save();

      return res.json({
        success: true,
        message: 'Shop images updated successfully.',
        shop: formatShop(shop, req.user)
      });
    } catch (err) {
      console.error('Shop image upload error:', err);
      return res.status(500).json({ success: false, message: 'Failed to upload shop images.' });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/shops/mine/images/:kind - Remove logo or banner
// ═══════════════════════════════════════════════════════════════════════════════
router.delete('/mine/images/:kind', authenticate, async (req, res) => {
  try {
    const kind = req.params.kind;
    if (kind !== 'logo' && kind !== 'banner') {
      return res.status(400).json({ success: false, message: 'Image kind must be "logo" or "banner".' });
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
          // Removing the reference matters more than remote cleanup
        }
      }
    }

    if (kind === 'logo') shop.logoUrl = '';
    else shop.bannerUrl = '';
    await shop.save();

    return res.json({
      success: true,
      message: `Shop ${kind === 'logo' ? 'logo' : 'cover photo'} removed.`,
      shop: formatShop(shop, req.user)
    });
  } catch (err) {
    console.error('Shop image delete error:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove shop image.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/shops/:idOrSlug - Single shop details and product catalogue
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

    // wishlistCount is derived from User.wishlist
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
    return res.status(500).json({ success: false, message: 'Failed to fetch shop details.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/shops/:id/products - Products for a specific shop
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:id/products', async (req, res) => {
  try {
    const shop = await findShopByIdOrSlug(req.params.id);
    if (!shop || shop.isBanned) {
      return res.status(404).json({ success: false, message: 'Shop not found.' });
    }

    const products = await Product.find({ shop: shop._id, status: 'active' })
      .populate('seller', 'fullName avatarUrl department hall isVerified rating')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (err) {
    console.error('Fetch shop products error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch shop products.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/shops/:id/follow - Toggle follow a shop
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:id/follow', authenticate, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found.' });
    }

    if (!Array.isArray(shop.followers)) {
      shop.followers = [];
    }

    const userIdStr = req.user._id.toString();
    const already = shop.followers.some((f) => f.toString() === userIdStr);

    if (already) {
      shop.followers = shop.followers.filter((f) => f.toString() !== userIdStr);
    } else {
      shop.followers.push(req.user._id);
    }

    await shop.save();

    return res.json({
      success: true,
      isFollowing: !already,
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
