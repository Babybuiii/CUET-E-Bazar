const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User = require('../models/User');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const AdminLog = require('../models/AdminLog');
const Giveaway = require('../models/Giveaway');

const { authenticate, requireAdmin } = require('../middleware/auth');
const { notify } = require('../utils/notify');

// All endpoints in this file require valid JWT + admin role
router.use(authenticate, requireAdmin);

// Helper to log admin actions
async function logAdminAction({ req, action, targetType, targetId = null, targetName = '', reason = '', details = {} }) {
  try {
    await AdminLog.create({
      admin: req.user._id,
      action,
      targetType,
      targetId,
      targetName,
      reason,
      details,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || ''
    });
  } catch (err) {
    console.error('Failed to write AdminLog:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. DASHBOARD OVERVIEW & RECENT ACTIVITY
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/dashboard', async (req, res) => {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalStudents,
      totalSellers,
      totalProducts,
      totalOrders,
      newUsersThisWeek,
      newProductsThisWeek,
      pendingReportsCount,
      bannedOrSuspendedUsers,
      recentUsers,
      recentProducts,
      latestReports,
      recentOrders
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Shop.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      User.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
      Product.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
      Report.countDocuments({ status: 'pending' }),
      User.countDocuments({ $or: [{ isBanned: true }, { isSuspended: true }] }),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('fullName email studentId department role createdAt avatarUrl isBanned isSuspended')
        .lean(),
      Product.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('seller', 'fullName email')
        .populate('shop', 'shopName')
        .select('title price category status images createdAt')
        .lean(),
      Report.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('reporter', 'fullName email studentId')
        .lean(),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('buyer', 'fullName email')
        .populate('seller', 'fullName email')
        .populate('product', 'title price')
        .select('totalPrice status createdAt')
        .lean()
    ]);

    // Attach target info to reports
    const enrichedReports = await Promise.all(
      latestReports.map(async (r) => {
        let targetName = 'Unknown';
        try {
          if (r.targetType === 'product') {
            const p = await Product.findById(r.targetId).select('title');
            if (p) targetName = p.title;
          } else if (r.targetType === 'shop') {
            const s = await Shop.findById(r.targetId).select('shopName');
            if (s) targetName = s.shopName;
          } else if (r.targetType === 'user') {
            const u = await User.findById(r.targetId).select('fullName email');
            if (u) targetName = u.fullName || u.email;
          }
        } catch {}
        return { ...r, targetName };
      })
    );

    return res.json({
      success: true,
      stats: {
        totalStudents,
        totalSellers,
        totalProducts,
        totalOrders,
        newUsersThisWeek,
        newProductsThisWeek,
        pendingReportsCount,
        bannedOrSuspendedUsers
      },
      recentActivity: {
        users: recentUsers,
        products: recentProducts,
        reports: enrichedReports,
        orders: recentOrders
      }
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard metrics.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/users', async (req, res) => {
  try {
    const { search, department, status, role = 'student', page = 1, limit = 20 } = req.query;
    const filter = {};

    if (role && role !== 'all') {
      filter.role = role;
    }

    if (department && department !== 'all') {
      filter.department = department;
    }

    if (status === 'banned') {
      filter.isBanned = true;
    } else if (status === 'suspended') {
      filter.isSuspended = true;
    } else if (status === 'warned') {
      filter['warnings.0'] = { $exists: true };
    } else if (status === 'active') {
      filter.isBanned = false;
      filter.isSuspended = false;
    } else if (status === 'unverified') {
      filter.isVerified = false;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { studentId: { $regex: q, $options: 'i' } },
        { department: { $regex: q, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-passwordHash')
        .lean(),
      User.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      users,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('Fetch admin users error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
});

// Single user complete profile & details
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash')
      .populate('shop')
      .populate('warnings.issuedBy', 'fullName email')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Activity counts and items
    const [listingsCount, ordersCount, giveawaysCount, reportsAgainst] = await Promise.all([
      Product.countDocuments({ seller: user._id }),
      Order.countDocuments({ $or: [{ buyer: user._id }, { seller: user._id }] }),
      Giveaway.countDocuments({ creator: user._id }),
      Report.find({ targetType: 'user', targetId: user._id })
        .populate('reporter', 'fullName email studentId')
        .lean()
    ]);

    const recentListings = await Product.find({ seller: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return res.json({
      success: true,
      user,
      activity: {
        listingsCount,
        ordersCount,
        giveawaysCount,
        recentListings,
        reportsAgainst
      }
    });
  } catch (err) {
    console.error('Fetch user details error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch user details.' });
  }
});

// Edit user profile info
router.patch('/users/:id/edit', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const { fullName, department, hall, contactNumber, isVerified, studentId } = req.body;

    if (fullName) user.fullName = fullName.trim();
    if (department !== undefined) user.department = department;
    if (hall !== undefined) user.hall = hall;
    if (contactNumber) user.contactNumber = contactNumber.trim();
    if (studentId !== undefined) user.studentId = studentId.trim();
    if (isVerified !== undefined) user.isVerified = Boolean(isVerified);

    await user.save();

    await logAdminAction({
      req,
      action: 'USER_EDITED',
      targetType: 'user',
      targetId: user._id,
      targetName: user.fullName,
      reason: 'Administrator profile update'
    });

    return res.json({
      success: true,
      message: 'User updated successfully.',
      user
    });
  } catch (err) {
    console.error('Edit user error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update user.' });
  }
});

// Warn user
router.post('/users/:id/warn', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Warning reason is required.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.warnings.push({
      reason: reason.trim(),
      issuedBy: req.user._id,
      date: new Date()
    });

    await user.save();

    // Send notification
    await notify({
      recipient: user._id,
      type: 'admin_warning',
      title: 'Official Moderation Warning',
      message: `You have received an official warning from campus administration: ${reason.trim()}`
    });

    await logAdminAction({
      req,
      action: 'USER_WARNED',
      targetType: 'user',
      targetId: user._id,
      targetName: user.fullName,
      reason: reason.trim()
    });

    return res.json({
      success: true,
      message: `Warning issued to ${user.fullName}.`,
      warnings: user.warnings
    });
  } catch (err) {
    console.error('Warn user error:', err);
    return res.status(500).json({ success: false, message: 'Failed to issue warning.' });
  }
});

// Temporarily suspend user
router.post('/users/:id/suspend', async (req, res) => {
  try {
    const { reason, durationDays = 7 } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Suspension reason is required.' });
    }

    const days = Math.max(1, parseInt(durationDays) || 7);
    const suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.isSuspended = true;
    user.suspendedUntil = suspendedUntil;
    user.suspensionReason = reason.trim();

    await user.save();

    await notify({
      recipient: user._id,
      type: 'admin_warning',
      title: `Account Suspended for ${days} Days`,
      message: `Your account has been temporarily suspended until ${suspendedUntil.toLocaleDateString()}. Reason: ${reason.trim()}`
    });

    await logAdminAction({
      req,
      action: 'USER_SUSPENDED',
      targetType: 'user',
      targetId: user._id,
      targetName: user.fullName,
      reason: reason.trim(),
      details: { days, suspendedUntil }
    });

    return res.json({
      success: true,
      message: `${user.fullName} has been suspended until ${suspendedUntil.toLocaleDateString()}.`,
      user
    });
  } catch (err) {
    console.error('Suspend user error:', err);
    return res.status(500).json({ success: false, message: 'Failed to suspend user.' });
  }
});

// Permanently ban user
router.post('/users/:id/ban', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Ban reason is required.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.isBanned = true;
    user.banReason = reason.trim();
    user.isSuspended = false; // permanent ban supersedes temporary suspension

    await user.save();

    await logAdminAction({
      req,
      action: 'USER_BANNED',
      targetType: 'user',
      targetId: user._id,
      targetName: user.fullName,
      reason: reason.trim()
    });

    return res.json({
      success: true,
      message: `${user.fullName} has been permanently banned.`,
      user
    });
  } catch (err) {
    console.error('Ban user error:', err);
    return res.status(500).json({ success: false, message: 'Failed to ban user.' });
  }
});

// Restore / Unban user
router.post('/users/:id/restore', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.isBanned = false;
    user.banReason = '';
    user.isSuspended = false;
    user.suspendedUntil = null;
    user.suspensionReason = '';

    await user.save();

    await notify({
      recipient: user._id,
      type: 'report_update',
      title: 'Account Restored',
      message: 'Your CUET E-Bazar account access has been fully restored by campus administration.'
    });

    await logAdminAction({
      req,
      action: 'USER_RESTORED',
      targetType: 'user',
      targetId: user._id,
      targetName: user.fullName,
      reason: 'Administrator restored account'
    });

    return res.json({
      success: true,
      message: `${user.fullName}'s account has been restored.`,
      user
    });
  } catch (err) {
    console.error('Restore user error:', err);
    return res.status(500).json({ success: false, message: 'Failed to restore user.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. SELLER & SHOP MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/sellers', async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (category && category !== 'all') {
      filter.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

    if (status === 'suspended') {
      filter.isSuspended = true;
    } else if (status === 'disabled') {
      filter.isDisabled = true;
    } else if (status === 'hidden') {
      filter.isHidden = true;
    } else if (status === 'banned') {
      filter.isBanned = true;
    } else if (status === 'active') {
      filter.isSuspended = false;
      filter.isDisabled = false;
      filter.isHidden = false;
      filter.isBanned = false;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { shopName: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [shops, total] = await Promise.all([
      Shop.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('owner', 'fullName email contactNumber studentId department isBanned isSuspended avatarUrl')
        .lean(),
      Shop.countDocuments(filter)
    ]);

    // Attach accurate product count for each shop
    const shopIds = shops.map((s) => s._id);
    const productCounts = await Product.aggregate([
      { $match: { shop: { $in: shopIds } } },
      { $group: { _id: '$shop', count: { $sum: 1 } } }
    ]);
    const pCountMap = {};
    productCounts.forEach((pc) => {
      pCountMap[pc._id.toString()] = pc.count;
    });

    const enrichedShops = shops.map((s) => ({
      ...s,
      productCount: pCountMap[s._id.toString()] || 0
    }));

    return res.json({
      success: true,
      shops: enrichedShops,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('Fetch admin sellers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch sellers.' });
  }
});

// Single shop complete details
router.get('/sellers/:id', async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id)
      .populate('owner', 'fullName email contactNumber studentId department isBanned isSuspended avatarUrl')
      .lean();

    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found.' });

    const [products, ordersCount, reportsAgainst] = await Promise.all([
      Product.find({ shop: shop._id }).sort({ createdAt: -1 }).lean(),
      Order.countDocuments({ shop: shop._id }),
      Report.find({ targetType: 'shop', targetId: shop._id })
        .populate('reporter', 'fullName email studentId')
        .lean()
    ]);

    return res.json({
      success: true,
      shop,
      products,
      ordersCount,
      reportsAgainst
    });
  } catch (err) {
    console.error('Fetch shop details error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch shop details.' });
  }
});

// Edit shop details
router.patch('/sellers/:id/edit', async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found.' });

    const { shopName, category, description, location, contactNumber, email, isVerified, isOpen } = req.body;

    if (shopName && shopName.trim()) shop.shopName = shopName.trim();
    if (category) shop.category = category.trim();
    if (description !== undefined) shop.description = description.trim();
    if (location !== undefined) shop.location = location.trim();
    if (contactNumber !== undefined) shop.contactNumber = contactNumber.trim();
    if (email !== undefined) shop.email = email.trim();
    if (isVerified !== undefined) shop.isVerified = Boolean(isVerified);
    if (isOpen !== undefined) shop.isOpen = Boolean(isOpen);

    await shop.save();

    await logAdminAction({
      req,
      action: 'SHOP_EDITED',
      targetType: 'shop',
      targetId: shop._id,
      targetName: shop.shopName,
      reason: 'Administrator edit'
    });

    return res.json({
      success: true,
      message: 'Shop updated successfully.',
      shop
    });
  } catch (err) {
    console.error('Edit shop error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update shop.' });
  }
});

// Suspend shop
router.post('/sellers/:id/suspend', async (req, res) => {
  try {
    const { reason, durationDays = 7 } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Suspension reason is required.' });
    }

    const days = Math.max(1, parseInt(durationDays) || 7);
    const suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found.' });

    shop.isSuspended = true;
    shop.suspendedUntil = suspendedUntil;
    shop.suspensionReason = reason.trim();
    await shop.save();

    // Notify shop owner
    await notify({
      recipient: shop.owner,
      type: 'admin_warning',
      title: `Shop Suspended for ${days} Days`,
      message: `Your shop "${shop.shopName}" has been suspended until ${suspendedUntil.toLocaleDateString()}. Reason: ${reason.trim()}`
    });

    await logAdminAction({
      req,
      action: 'SHOP_SUSPENDED',
      targetType: 'shop',
      targetId: shop._id,
      targetName: shop.shopName,
      reason: reason.trim(),
      details: { days, suspendedUntil }
    });

    return res.json({
      success: true,
      message: `Shop "${shop.shopName}" suspended until ${suspendedUntil.toLocaleDateString()}.`,
      shop
    });
  } catch (err) {
    console.error('Suspend shop error:', err);
    return res.status(500).json({ success: false, message: 'Failed to suspend shop.' });
  }
});

// Permanently disable shop
router.post('/sellers/:id/disable', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Reason is required to disable shop.' });
    }

    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found.' });

    shop.isDisabled = true;
    shop.suspensionReason = reason.trim();
    await shop.save();

    await notify({
      recipient: shop.owner,
      type: 'admin_warning',
      title: 'Shop Permanently Disabled',
      message: `Your campus shop "${shop.shopName}" has been permanently disabled by administration. Reason: ${reason.trim()}`
    });

    await logAdminAction({
      req,
      action: 'SHOP_DISABLED',
      targetType: 'shop',
      targetId: shop._id,
      targetName: shop.shopName,
      reason: reason.trim()
    });

    return res.json({
      success: true,
      message: `Shop "${shop.shopName}" has been disabled.`,
      shop
    });
  } catch (err) {
    console.error('Disable shop error:', err);
    return res.status(500).json({ success: false, message: 'Failed to disable shop.' });
  }
});

// Hide or unhide shop from public listing
router.post('/sellers/:id/toggle-visibility', async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found.' });

    shop.isHidden = !shop.isHidden;
    await shop.save();

    await logAdminAction({
      req,
      action: shop.isHidden ? 'SHOP_HIDDEN' : 'SHOP_RESTORED',
      targetType: 'shop',
      targetId: shop._id,
      targetName: shop.shopName,
      reason: shop.isHidden ? 'Hidden from directory' : 'Restored to directory'
    });

    return res.json({
      success: true,
      message: `Shop "${shop.shopName}" is now ${shop.isHidden ? 'hidden from' : 'visible in'} the directory.`,
      isHidden: shop.isHidden
    });
  } catch (err) {
    console.error('Toggle shop visibility error:', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle shop visibility.' });
  }
});

// Restore shop to active
router.post('/sellers/:id/restore', async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found.' });

    shop.isSuspended = false;
    shop.suspendedUntil = null;
    shop.isDisabled = false;
    shop.isHidden = false;
    shop.isBanned = false;
    shop.suspensionReason = '';
    await shop.save();

    await notify({
      recipient: shop.owner,
      type: 'report_update',
      title: 'Shop Restored',
      message: `Your campus shop "${shop.shopName}" has been restored to active status.`
    });

    await logAdminAction({
      req,
      action: 'SHOP_RESTORED',
      targetType: 'shop',
      targetId: shop._id,
      targetName: shop.shopName,
      reason: 'Administrator restored shop'
    });

    return res.json({
      success: true,
      message: `Shop "${shop.shopName}" has been restored.`,
      shop
    });
  } catch (err) {
    console.error('Restore shop error:', err);
    return res.status(500).json({ success: false, message: 'Failed to restore shop.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. PRODUCT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/products', async (req, res) => {
  try {
    const { search, category, status, sellerType, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (sellerType === 'individual') {
      filter.shop = null;
      filter.sellerType = { $ne: 'shop' };
    } else if (sellerType === 'shop') {
      filter.$or = [{ shop: { $ne: null } }, { sellerType: 'shop' }];
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('seller', 'fullName email studentId department')
        .populate('shop', 'shopName slug')
        .lean(),
      Product.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      products,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('Fetch admin products error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
});

// Single product details
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'fullName email contactNumber studentId department isBanned')
      .populate('shop', 'shopName slug isVerified isSuspended')
      .lean();

    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const reports = await Report.find({ targetType: 'product', targetId: product._id })
      .populate('reporter', 'fullName email studentId')
      .lean();

    return res.json({
      success: true,
      product,
      reports
    });
  } catch (err) {
    console.error('Fetch product details error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch product details.' });
  }
});

// Edit product
router.patch('/products/:id/edit', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const { title, description, category, price, condition, stock } = req.body;

    if (title && title.trim()) product.title = title.trim();
    if (description !== undefined) product.description = description.trim();
    if (category) product.category = category.trim();
    if (price !== undefined && !isNaN(Number(price))) product.price = Number(price);
    if (condition) product.condition = condition;
    if (stock !== undefined && !isNaN(Number(stock))) product.stock = Math.max(0, Number(stock));

    await product.save();

    await logAdminAction({
      req,
      action: 'PRODUCT_EDITED',
      targetType: 'product',
      targetId: product._id,
      targetName: product.title,
      reason: 'Administrator edit'
    });

    return res.json({
      success: true,
      message: 'Product updated successfully.',
      product
    });
  } catch (err) {
    console.error('Edit product error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update product.' });
  }
});

// Hide product
router.post('/products/:id/hide', async (req, res) => {
  try {
    const { reason = 'Hidden by admin moderation' } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    product.status = 'hidden';
    product.adminNotes = reason.trim();
    await product.save();

    await logAdminAction({
      req,
      action: 'PRODUCT_HIDDEN',
      targetType: 'product',
      targetId: product._id,
      targetName: product.title,
      reason: reason.trim()
    });

    return res.json({
      success: true,
      message: `Product "${product.title}" has been hidden from marketplace.`,
      product
    });
  } catch (err) {
    console.error('Hide product error:', err);
    return res.status(500).json({ success: false, message: 'Failed to hide product.' });
  }
});

// Remove product (marks as removed_by_admin)
router.post('/products/:id/remove', async (req, res) => {
  try {
    const { reason = 'Listing violates CUET E-Bazar guidelines' } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    product.status = 'removed_by_admin';
    product.adminNotes = reason.trim();
    await product.save();

    // Notify seller
    await notify({
      recipient: product.seller,
      type: 'admin_warning',
      title: 'Listing Removed by Moderator',
      message: `Your listing "${product.title}" was removed from the marketplace. Reason: ${reason.trim()}`
    });

    await logAdminAction({
      req,
      action: 'PRODUCT_REMOVED',
      targetType: 'product',
      targetId: product._id,
      targetName: product.title,
      reason: reason.trim()
    });

    return res.json({
      success: true,
      message: `Product "${product.title}" removed.`,
      product
    });
  } catch (err) {
    console.error('Remove product error:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove product.' });
  }
});

// Restore product to active
router.post('/products/:id/restore', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    product.status = 'active';
    product.adminNotes = '';
    await product.save();

    await logAdminAction({
      req,
      action: 'PRODUCT_RESTORED',
      targetType: 'product',
      targetId: product._id,
      targetName: product.title,
      reason: 'Administrator restored listing'
    });

    return res.json({
      success: true,
      message: `Product "${product.title}" restored to active status.`,
      product
    });
  } catch (err) {
    console.error('Restore product error:', err);
    return res.status(500).json({ success: false, message: 'Failed to restore product.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. REPORTS & MODERATION
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/reports', async (req, res) => {
  try {
    const { status, targetType, reason, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (targetType && targetType !== 'all') {
      filter.targetType = targetType;
    }

    if (reason && reason !== 'all') {
      filter.reason = reason;
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('reporter', 'fullName email studentId department')
        .populate('resolvedBy', 'fullName email')
        .lean(),
      Report.countDocuments(filter)
    ]);

    // Dynamically resolve target details
    const enrichedReports = await Promise.all(
      reports.map(async (r) => {
        let targetEntity = null;
        try {
          if (r.targetType === 'product') {
            targetEntity = await Product.findById(r.targetId)
              .select('title price category status images seller shop')
              .populate('seller', 'fullName email')
              .lean();
          } else if (r.targetType === 'shop') {
            targetEntity = await Shop.findById(r.targetId)
              .select('shopName category isSuspended isDisabled isHidden owner')
              .populate('owner', 'fullName email')
              .lean();
          } else if (r.targetType === 'user') {
            targetEntity = await User.findById(r.targetId)
              .select('fullName email studentId department isBanned isSuspended')
              .lean();
          } else if (r.targetType === 'giveaway') {
            targetEntity = await Giveaway.findById(r.targetId).select('title status creator').lean();
          }
        } catch {}

        return {
          ...r,
          targetEntity
        };
      })
    );

    return res.json({
      success: true,
      reports: enrichedReports,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('Fetch admin reports error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch reports.' });
  }
});

// Single report details
router.get('/reports/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('reporter', 'fullName email studentId department contactNumber')
      .populate('resolvedBy', 'fullName email')
      .lean();

    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

    let targetEntity = null;
    if (report.targetType === 'product') {
      targetEntity = await Product.findById(report.targetId)
        .populate('seller', 'fullName email studentId contactNumber')
        .populate('shop', 'shopName slug')
        .lean();
    } else if (report.targetType === 'shop') {
      targetEntity = await Shop.findById(report.targetId)
        .populate('owner', 'fullName email contactNumber studentId')
        .lean();
    } else if (report.targetType === 'user') {
      targetEntity = await User.findById(report.targetId)
        .select('-passwordHash')
        .lean();
    }

    return res.json({
      success: true,
      report: {
        ...report,
        targetEntity
      }
    });
  } catch (err) {
    console.error('Fetch report detail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch report detail.' });
  }
});

// Moderation Action on Report
router.post('/reports/:id/action', async (req, res) => {
  try {
    const { action, adminNotes = '', reason = '', durationDays = 7 } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

    const note = adminNotes.trim() || reason.trim() || `Moderation action (${(action || '').replace(/_/g, ' ')}) applied by administrator.`;
    let actionSummary = '';

    if (action === 'dismiss') {
      report.status = 'dismissed';
      report.adminNotes = note;
      actionSummary = 'Report dismissed';
      await logAdminAction({
        req,
        action: 'REPORT_DISMISSED',
        targetType: 'report',
        targetId: report._id,
        reason: note
      });
    } else if (action === 'warn_user') {
      // Find user to warn
      let targetUserId = null;
      if (report.targetType === 'user') targetUserId = report.targetId;
      else if (report.targetType === 'product') {
        const p = await Product.findById(report.targetId);
        if (p) targetUserId = p.seller;
      } else if (report.targetType === 'shop') {
        const s = await Shop.findById(report.targetId);
        if (s) targetUserId = s.owner;
      }

      if (targetUserId) {
        const u = await User.findById(targetUserId);
        if (u) {
          if (!Array.isArray(u.warnings)) u.warnings = [];
          u.warnings.push({
            reason: note || 'Violation reported and confirmed by moderation',
            issuedBy: req.user._id,
            date: new Date()
          });
          await u.save();
          await notify({
            recipient: u._id,
            type: 'admin_warning',
            title: 'Official Moderation Warning',
            message: `Warning issued regarding report #${report._id.toString().slice(-6)}: ${note || 'Policy violation'}`
          });
        }
      }
      report.status = 'resolved';
      report.actionTaken = 'warn_user';
      report.adminNotes = note;
      actionSummary = 'User warned and report resolved';
    } else if (action === 'hide_product' || action === 'remove_product') {
      if (report.targetType === 'product') {
        const p = await Product.findById(report.targetId);
        if (p) {
          p.status = action === 'hide_product' ? 'hidden' : 'removed_by_admin';
          p.adminNotes = note;
          await p.save();
          await logAdminAction({
            req,
            action: action === 'hide_product' ? 'PRODUCT_HIDDEN' : 'PRODUCT_REMOVED',
            targetType: 'product',
            targetId: p._id,
            targetName: p.title || '',
            reason: note
          });
        }
      }
      report.status = 'resolved';
      report.actionTaken = action;
      report.adminNotes = note;
      actionSummary = action === 'hide_product' ? 'Product hidden' : 'Product removed';
    } else if (action === 'suspend_shop' || action === 'disable_shop') {
      if (report.targetType === 'shop') {
        const s = await Shop.findById(report.targetId);
        if (s) {
          if (action === 'suspend_shop') {
            s.isSuspended = true;
            s.suspendedUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
            s.suspensionReason = note;
          } else {
            s.isDisabled = true;
            s.suspensionReason = note;
          }
          await s.save();
        }
      }
      report.status = 'resolved';
      report.actionTaken = action;
      report.adminNotes = note;
      actionSummary = action === 'suspend_shop' ? 'Shop suspended' : 'Shop disabled';
    } else if (action === 'suspend_user' || action === 'ban_user') {
      let targetUserId = null;
      if (report.targetType === 'user') targetUserId = report.targetId;
      else if (report.targetType === 'product') {
        const p = await Product.findById(report.targetId);
        if (p) targetUserId = p.seller;
      } else if (report.targetType === 'shop') {
        const s = await Shop.findById(report.targetId);
        if (s) targetUserId = s.owner;
      }

      if (targetUserId) {
        const u = await User.findById(targetUserId);
        if (u) {
          if (action === 'suspend_user') {
            u.isSuspended = true;
            u.suspendedUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
            u.suspensionReason = note;
          } else {
            u.isBanned = true;
            u.banReason = note;
          }
          await u.save();
        }
      }
      report.status = 'resolved';
      report.actionTaken = action;
      report.adminNotes = note;
      actionSummary = action === 'suspend_user' ? 'User suspended' : 'User banned';
    } else if (action === 'mark_under_review') {
      report.status = 'under_review';
      report.actionTaken = 'mark_under_review';
      report.adminNotes = note || 'Under investigation by moderator.';
      actionSummary = 'Report marked under review';
    } else {
      report.status = 'resolved';
      report.adminNotes = note || 'Marked as resolved.';
      actionSummary = 'Report resolved';
    }

    if (action !== 'mark_under_review') {
      report.resolvedBy = req.user._id;
      report.resolvedAt = new Date();
    }
    await report.save();

    // Notify the reporter
    if (report.reporter) {
      await notify({
        recipient: report.reporter,
        type: 'report_update',
        title: 'Report Update',
        message: `Your report regarding a ${report.targetType} has been marked as ${report.status}. Thank you for helping keep CUET E-Bazar safe.`
      });
    }

    await logAdminAction({
      req,
      action: action === 'mark_under_review' ? 'REPORT_STATUS_UPDATED' : action === 'dismiss' ? 'REPORT_DISMISSED' : 'REPORT_RESOLVED',
      targetType: 'report',
      targetId: report._id,
      reason: note,
      details: { action, actionSummary }
    });

    return res.json({
      success: true,
      message: `Action recorded: ${actionSummary}.`,
      report
    });
  } catch (err) {
    console.error('Report action error:', err);
    return res.status(500).json({ success: false, message: 'Failed to perform report action.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/analytics', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    let startDate = new Date(0); // all time

    if (period === '7d') {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === '30d') {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === '90d') {
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    }

    // A. User Analytics
    const [
      totalStudents,
      activeStudents,
      usersOverTime,
      departmentDistribution
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'student', lastActive: { $gte: startDate } }),
      User.aggregate([
        { $match: { role: 'student', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      User.aggregate([
        { $match: { role: 'student', department: { $ne: '' } } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    // B. Marketplace Analytics
    const [
      totalProducts,
      activeProducts,
      soldProducts,
      productsOverTime,
      categoryDistribution
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ status: 'active' }),
      Product.countDocuments({ status: 'sold' }),
      Product.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Product.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    // C. Order Analytics
    const [
      totalOrders,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      ordersOverTime
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'completed' }),
      Order.countDocuments({ status: { $in: ['pending', 'confirmed', 'preparing', 'ready_for_pickup'] } }),
      Order.countDocuments({ status: 'cancelled' }),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // D. Seller Analytics
    const [
      totalSellers,
      activeShops,
      topPerformingShops,
      productsPerShopAgg
    ] = await Promise.all([
      Shop.countDocuments(),
      Shop.countDocuments({ isSuspended: false, isDisabled: false, isHidden: false, isBanned: false }),
      Shop.find({ isBanned: false })
        .sort({ totalSales: -1, rating: -1 })
        .limit(5)
        .select('shopName category totalSales rating totalProducts')
        .lean(),
      Product.aggregate([
        { $match: { shop: { $ne: null } } },
        { $group: { _id: '$shop', productCount: { $sum: 1 } } }
      ])
    ]);

    return res.json({
      success: true,
      period,
      userAnalytics: {
        totalStudents,
        activeStudents,
        usersOverTime,
        departmentDistribution
      },
      marketplaceAnalytics: {
        totalProducts,
        activeProducts,
        soldProducts,
        productsOverTime,
        categoryDistribution
      },
      orderAnalytics: {
        totalOrders,
        completedOrders,
        pendingOrders,
        cancelledOrders,
        ordersOverTime
      },
      sellerAnalytics: {
        totalSellers,
        activeShops,
        topPerformingShops,
        totalShopProducts: productsPerShopAgg.reduce((acc, curr) => acc + curr.productCount, 0)
      }
    });
  } catch (err) {
    console.error('Fetch analytics error:', err);
    return res.status(500).json({ success: false, message: 'Failed to calculate platform analytics.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });

    return res.json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (err) {
    console.error('Fetch admin notifications error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
});

router.patch('/notifications/:id/read', async (req, res) => {
  try {
    const notif = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found.' });

    notif.isRead = true;
    notif.readAt = new Date();
    await notif.save();

    return res.json({ success: true, notification: notif });
  } catch (err) {
    console.error('Mark notification read error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
});

router.post('/notifications/mark-all-read', async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark all read error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update notifications.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. ADMIN ACTIVITY LOGS
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/logs', async (req, res) => {
  try {
    const { action, targetType, page = 1, limit = 30 } = req.query;
    const filter = {};

    if (action && action !== 'all') {
      filter.action = action;
    }

    if (targetType && targetType !== 'all') {
      filter.targetType = targetType;
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 30));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AdminLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('admin', 'fullName email')
        .lean(),
      AdminLog.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      logs,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('Fetch admin logs error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch activity logs.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. SETTINGS & PROFILE
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/settings', async (req, res) => {
  try {
    const adminUser = await User.findById(req.user._id)
      .select('fullName email role createdAt lastActive userId contactNumber')
      .lean();

    return res.json({
      success: true,
      admin: adminUser,
      systemInfo: {
        nodeEnv: process.env.NODE_ENV || 'development',
        serverTime: new Date().toISOString(),
        databaseStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
      }
    });
  } catch (err) {
    console.error('Fetch settings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch settings.' });
  }
});

router.post('/settings/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    const admin = await User.findById(req.user._id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found.' });

    const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match.' });
    }

    admin.passwordHash = await bcrypt.hash(newPassword, 10);
    await admin.save();

    await logAdminAction({
      req,
      action: 'ADMIN_PASSWORD_CHANGED',
      targetType: 'system',
      targetId: admin._id,
      targetName: admin.fullName,
      reason: 'Administrator changed their password'
    });

    return res.json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
});

module.exports = router;

