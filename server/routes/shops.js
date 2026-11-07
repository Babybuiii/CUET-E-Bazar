const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const { authenticate } = require('../middleware/auth');
const { upload, uploadShopImages, cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

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
// GET /api/shops/owner/my-shop  — Shop owner fetches their own shop profile
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/owner/my-shop', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'shop_owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only shop owners can access this endpoint.' });
    }

    const shop = await Shop.findOne({ owner: req.user._id })
      .populate('owner', 'fullName email contactNumber avatarUrl department')
      .lean();

    if (!shop) {
      return res.status(404).json({ success: false, message: 'No shop found for your account.' });
    }

    // Attach live counts
    const [liveProductCount, totalOrderCount, pendingOrderCount, completedOrderCount] = await Promise.all([
      Product.countDocuments({ shop: shop._id }),
      Order.countDocuments({ shop: shop._id }),
      Order.countDocuments({ shop: shop._id, status: 'pending' }),
      Order.countDocuments({ shop: shop._id, status: 'completed' })
    ]);

    // Total items sold (sum of quantity from completed orders)
    const soldAgg = await Order.aggregate([
      { $match: { shop: shop._id, status: 'completed' } },
      { $group: { _id: null, totalQty: { $sum: '$quantity' } } }
    ]);
    const totalItemsSold = soldAgg.length > 0 ? soldAgg[0].totalQty : 0;

    return res.json({
      success: true,
      shop: {
        ...shop,
        totalProducts: liveProductCount,
        followersCount: Array.isArray(shop.followers) ? shop.followers.length : 0
      },
      stats: {
        totalProducts: liveProductCount,
        totalOrders: totalOrderCount,
        pendingOrders: pendingOrderCount,
        completedOrders: completedOrderCount,
        totalItemsSold
      }
    });
  } catch (err) {
    console.error('Fetch owner shop error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch your shop.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/shops/owner/my-shop  — Shop owner updates their own shop profile
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/owner/my-shop', authenticate, upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]), async (req, res) => {
  try {
    if (req.user.role !== 'shop_owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only shop owners can access this endpoint.' });
    }

    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'No shop found for your account.' });
    }

    const { shopName, description, location, contactNumber, email, category,
            openHour, closeHour, isOpen } = req.body;

    if (shopName && shopName.trim()) {
      // Check uniqueness (excluding current shop)
      const existing = await Shop.findOne({ shopName: shopName.trim(), _id: { $ne: shop._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'A shop with this name already exists.' });
      }
      shop.shopName = shopName.trim();
    }

    if (description !== undefined) shop.description = description.trim();
    if (location !== undefined) shop.location = location.trim();
    if (contactNumber !== undefined) shop.contactNumber = contactNumber.trim();
    if (email !== undefined) shop.email = email.trim().toLowerCase();
    if (category !== undefined) shop.category = category.trim();

    if (!shop.operatingHours) {
      shop.operatingHours = { open: '09:00', close: '21:00' };
    }
    if (openHour !== undefined) shop.operatingHours.open = openHour;
    if (closeHour !== undefined) shop.operatingHours.close = closeHour;
    if (isOpen !== undefined) shop.isOpen = isOpen === 'true' || isOpen === true;

    // Handle uploaded images (Cloudinary with memory buffer fallback)
    const files = req.files || {};

    if (files.logo && files.logo[0]) {
      const file = files.logo[0];
      let newLogoUrl = '';
      if (isCloudinaryConfigured) {
        newLogoUrl = file.path || file.secure_url || file.url || '';
      } else if (file.buffer) {
        newLogoUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      }

      if (newLogoUrl) {
        if (shop.logoUrl && isCloudinaryConfigured && shop.logoUrl.includes('cloudinary.com')) {
          try {
            const oldPublicId = shop.logoUrl.split('/').slice(-2).join('/').split('.')[0];
            await cloudinary.uploader.destroy(oldPublicId);
          } catch (_) {}
        }
        shop.logoUrl = newLogoUrl;
      }
    }

    if (files.banner && files.banner[0]) {
      const file = files.banner[0];
      let newBannerUrl = '';
      if (isCloudinaryConfigured) {
        newBannerUrl = file.path || file.secure_url || file.url || '';
      } else if (file.buffer) {
        newBannerUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      }

      if (newBannerUrl) {
        if (shop.bannerUrl && isCloudinaryConfigured && shop.bannerUrl.includes('cloudinary.com')) {
          try {
            const oldPublicId = shop.bannerUrl.split('/').slice(-2).join('/').split('.')[0];
            await cloudinary.uploader.destroy(oldPublicId);
          } catch (_) {}
        }
        shop.bannerUrl = newBannerUrl;
      }
    }

    await shop.save();

    return res.json({
      success: true,
      message: 'Shop profile updated successfully.',
      shop
    });
  } catch (err) {
    console.error('Update owner shop error:', err);
    const statusCode = err.name === 'ValidationError' ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Failed to update shop profile.'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/shops/owner/products  — Shop owner lists all their shop's products
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/owner/products', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'shop_owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only shop owners can access this endpoint.' });
    }

    const shop = await Shop.findOne({ owner: req.user._id }).select('_id');
    if (!shop) {
      return res.status(404).json({ success: false, message: 'No shop found for your account.' });
    }

    const { status, search, sort = 'newest' } = req.query;
    const filter = { shop: shop._id };

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    if (sort === 'price_desc') sortOption = { price: -1 };
    if (sort === 'stock_asc') sortOption = { stock: 1 };

    const products = await Product.find(filter).sort(sortOption).lean();

    // Attach quantity sold per product (from completed orders)
    const productIds = products.map(p => p._id);
    const salesAgg = await Order.aggregate([
      { $match: { product: { $in: productIds }, status: 'completed' } },
      { $group: { _id: '$product', qtySold: { $sum: '$quantity' } } }
    ]);
    const salesMap = {};
    salesAgg.forEach(s => { salesMap[s._id.toString()] = s.qtySold; });

    const productsWithSales = products.map(p => ({
      ...p,
      qtySold: salesMap[p._id.toString()] || 0
    }));

    return res.json({
      success: true,
      count: productsWithSales.length,
      products: productsWithSales
    });
  } catch (err) {
    console.error('Fetch owner products error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/shops/owner/products  — Add a new product to the owner's shop
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/owner/products', authenticate, upload.array('images', 8), async (req, res) => {
  const files = req.files || [];
  try {
    if (req.user.role !== 'shop_owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only shop owners can add products.' });
    }

    // Strictly resolve shop by logged-in owner's user ID — never trust client-supplied shop ID
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'No shop found for your account.' });
    }

    const { title, description, category, price, stock, status = 'active' } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Product title is required.' });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: 'Product category is required.' });
    }

    if (price === undefined || price === '' || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ success: false, message: 'A valid product price (>= 0) is required.' });
    }

    if (files.length < 1) {
      return res.status(400).json({ success: false, message: 'At least 1 product image is required.' });
    }

    function makeThumbnailUrl(url) {
      if (!url || typeof url !== 'string') return '';
      if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
        return url.replace('/upload/', '/upload/c_limit,w_800,q_auto:best,f_auto/');
      }
      return url;
    }

    let images = [];
    if (isCloudinaryConfigured) {
      images = files.map((f, idx) => {
        const fullUrl = f.path || f.secure_url || f.url || '';
        return {
          url: fullUrl,
          thumbnailUrl: makeThumbnailUrl(fullUrl),
          publicId: f.filename || f.public_id || `shop-product-${Date.now()}-${idx}`,
          isCover: idx === 0
        };
      });
    } else {
      images = files.map((f, idx) => {
        const base64Data = f.buffer ? `data:${f.mimetype};base64,${f.buffer.toString('base64')}` : '';
        return {
          url: base64Data,
          thumbnailUrl: base64Data,
          publicId: `local-shop-${Date.now()}-${idx}`,
          isCover: idx === 0
        };
      });
    }

    // Shop products only need 1 image minimum
    const newProduct = await Product.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      category: category.trim(),
      price: Number(price),
      stock: Math.max(0, Number(stock) || 0),
      status: status || 'active',
      images,
      seller: req.user._id,
      shop: shop._id,
      sellerType: 'shop',
      condition: 'New',
      location: shop.location || 'CUET Campus'
    });

    // Update shop's totalProducts count
    await Shop.findByIdAndUpdate(shop._id, { $inc: { totalProducts: 1 } });

    return res.status(201).json({
      success: true,
      message: 'Product added successfully.',
      product: newProduct
    });
  } catch (err) {
    console.error('Add shop product error:', err);
    // Clean up uploaded Cloudinary images if creation failed
    if (isCloudinaryConfigured && files.length > 0) {
      await Promise.all(
        files.map(f => {
          const publicId = f.filename || f.public_id;
          return publicId ? cloudinary.uploader.destroy(publicId).catch(() => {}) : Promise.resolve();
        })
      );
    }
    const statusCode = err.name === 'ValidationError' ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Failed to add product.'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/shops/owner/products/:id  — Edit a product (owner only)
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/owner/products/:id', authenticate, upload.array('images', 8), async (req, res) => {
  const files = req.files || [];
  try {
    if (req.user.role !== 'shop_owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only shop owners can edit products.' });
    }

    const shop = await Shop.findOne({ owner: req.user._id }).select('_id location');
    if (!shop) {
      return res.status(404).json({ success: false, message: 'No shop found for your account.' });
    }

    const product = await Product.findOne({ _id: req.params.id, shop: shop._id });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found or not owned by your shop.' });
    }

    const { title, description, category, price, stock, status } = req.body;

    if (title !== undefined && title.trim()) product.title = title.trim();
    if (description !== undefined) product.description = description.trim();
    if (category !== undefined && category.trim()) product.category = category.trim();
    if (price !== undefined && !isNaN(Number(price))) product.price = Number(price);
    if (stock !== undefined && !isNaN(Number(stock))) product.stock = Math.max(0, Number(stock));
    if (status !== undefined) product.status = status;

    if (files.length > 0) {
      function makeThumbnailUrl(url) {
        if (!url || typeof url !== 'string') return '';
        if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
          return url.replace('/upload/', '/upload/c_limit,w_800,q_auto:best,f_auto/');
        }
        return url;
      }

      let newImages = [];
      if (isCloudinaryConfigured) {
        newImages = files.map((f, idx) => {
          const fullUrl = f.path || f.secure_url || f.url || '';
          return {
            url: fullUrl,
            thumbnailUrl: makeThumbnailUrl(fullUrl),
            publicId: f.filename || f.public_id || `shop-product-${Date.now()}-${idx}`,
            isCover: idx === 0
          };
        });
      } else {
        newImages = files.map((f, idx) => {
          const base64Data = f.buffer ? `data:${f.mimetype};base64,${f.buffer.toString('base64')}` : '';
          return {
            url: base64Data,
            thumbnailUrl: base64Data,
            publicId: `local-shop-${Date.now()}-${idx}`,
            isCover: idx === 0
          };
        });
      }

      // If old images were on Cloudinary, delete them
      if (isCloudinaryConfigured && Array.isArray(product.images)) {
        await Promise.all(
          product.images.map(img => {
            if (img.publicId && !img.publicId.startsWith('local-')) {
              return cloudinary.uploader.destroy(img.publicId).catch(() => {});
            }
            return Promise.resolve();
          })
        );
      }

      product.images = newImages;
    }

    await product.save();

    return res.json({
      success: true,
      message: 'Product updated successfully.',
      product
    });
  } catch (err) {
    console.error('Update shop product error:', err);
    if (isCloudinaryConfigured && files.length > 0) {
      await Promise.all(
        files.map(f => {
          const publicId = f.filename || f.public_id;
          return publicId ? cloudinary.uploader.destroy(publicId).catch(() => {}) : Promise.resolve();
        })
      );
    }
    const statusCode = err.name === 'ValidationError' ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Failed to update product.'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/shops/owner/products/:id/stock  — Quick stock update
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/owner/products/:id/stock', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'shop_owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only shop owners can update stock.' });
    }

    const shop = await Shop.findOne({ owner: req.user._id }).select('_id');
    if (!shop) {
      return res.status(404).json({ success: false, message: 'No shop found for your account.' });
    }

    const product = await Product.findOne({ _id: req.params.id, shop: shop._id });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found or not owned by your shop.' });
    }

    const { stock } = req.body;
    if (stock === undefined || isNaN(Number(stock))) {
      return res.status(400).json({ success: false, message: 'Valid stock value is required.' });
    }

    product.stock = Math.max(0, Number(stock));
    await product.save();

    return res.json({
      success: true,
      message: 'Stock updated successfully.',
      stock: product.stock
    });
  } catch (err) {
    console.error('Update stock error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update stock.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/shops/owner/products/:id  — Archive/delete a product (owner only)
// ═══════════════════════════════════════════════════════════════════════════════
router.delete('/owner/products/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'shop_owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only shop owners can delete products.' });
    }

    const shop = await Shop.findOne({ owner: req.user._id }).select('_id');
    if (!shop) {
      return res.status(404).json({ success: false, message: 'No shop found for your account.' });
    }

    const product = await Product.findOne({ _id: req.params.id, shop: shop._id });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found or not owned by your shop.' });
    }

    // Soft delete — mark as removed_by_admin to preserve historical order records
    product.status = 'removed_by_admin';
    await product.save();

    return res.json({
      success: true,
      message: 'Product archived successfully. Historical orders are preserved.'
    });
  } catch (err) {
    console.error('Delete shop product error:', err);
    return res.status(500).json({ success: false, message: 'Failed to archive product.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/shops - Public directory of campus shops with search, filter & count
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { category, search, sort = 'newest', limit = 50 } = req.query;
    const filter = {
      isBanned: { $ne: true },
      isSuspended: { $ne: true },
      isDisabled: { $ne: true },
      isHidden: { $ne: true }
    };

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
