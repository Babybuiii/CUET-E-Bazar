const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/shops - List all campus shops with filtering & live product count
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { search, category, sort = 'newest' } = req.query;
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
      .populate('owner', 'fullName email contactNumber avatarUrl department hall isVerified rating')
      .sort(sortOption)
      .lean();

    // Attach accurate live product counts for each shop
    const shopIds = shops.map((s) => s._id);
    const productCounts = await Product.aggregate([
      {
        $match: {
          shop: { $in: shopIds },
          status: { $in: ['active', 'available'] }
        }
      },
      {
        $group: {
          _id: '$shop',
          count: { $sum: 1 }
        }
      }
    ]);

    const countMap = {};
    productCounts.forEach((p) => {
      countMap[p._id.toString()] = p.count;
    });

    const shopsWithCount = shops.map((s) => ({
      ...s,
      totalProducts: countMap[s._id.toString()] || 0,
      followersCount: Array.isArray(s.followers) ? s.followers.length : 0
    }));

    return res.json({
      success: true,
      count: shopsWithCount.length,
      shops: shopsWithCount
    });
  } catch (err) {
    console.error('Fetch shops error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch campus shops.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/shops/:id - Get single shop details by ID or Slug
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const rawId = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(rawId);

    const query = isObjectId
      ? { $or: [{ _id: rawId }, { slug: rawId.toLowerCase() }] }
      : { slug: rawId.toLowerCase() };

    const shop = await Shop.findOne(query)
      .populate('owner', 'fullName email contactNumber avatarUrl department hall isVerified rating')
      .lean();

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Campus shop not found.' });
    }

    const liveProductCount = await Product.countDocuments({
      shop: shop._id,
      status: { $in: ['active', 'available'] }
    });

    return res.json({
      success: true,
      shop: {
        ...shop,
        totalProducts: liveProductCount,
        followersCount: Array.isArray(shop.followers) ? shop.followers.length : 0
      }
    });
  } catch (err) {
    console.error('Fetch shop details error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch shop details.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/shops/:id/products - Get all active products for a specific shop
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:id/products', async (req, res) => {
  try {
    const rawId = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(rawId);

    const query = isObjectId
      ? { $or: [{ _id: rawId }, { slug: rawId.toLowerCase() }] }
      : { slug: rawId.toLowerCase() };

    const shop = await Shop.findOne(query).select('_id shopName location');
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Campus shop not found.' });
    }

    const { category, search, sort = 'newest' } = req.query;
    const filter = {
      shop: shop._id,
      status: { $in: ['active', 'available'] }
    };

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    if (sort === 'price_desc') sortOption = { price: -1 };

    const products = await Product.find(filter)
      .populate('seller', 'fullName userId rating avatarUrl department hall isVerified')
      .populate('shop', 'shopName slug location isVerified rating')
      .sort(sortOption);

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
    const rawId = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(rawId);

    const query = isObjectId
      ? { $or: [{ _id: rawId }, { slug: rawId.toLowerCase() }] }
      : { slug: rawId.toLowerCase() };

    const shop = await Shop.findOne(query);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found.' });
    }

    if (!Array.isArray(shop.followers)) {
      shop.followers = [];
    }

    const userIdStr = req.user._id.toString();
    const existingIndex = shop.followers.findIndex((f) => f.toString() === userIdStr);

    let isFollowing = false;
    if (existingIndex > -1) {
      shop.followers.splice(existingIndex, 1);
      isFollowing = false;
    } else {
      shop.followers.push(req.user._id);
      isFollowing = true;
    }

    await shop.save();

    return res.json({
      success: true,
      isFollowing,
      followersCount: shop.followers.length,
      message: isFollowing ? 'You are now following this shop!' : 'Unfollowed shop.'
    });
  } catch (err) {
    console.error('Follow shop error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update follow status.' });
  }
});

module.exports = router;
