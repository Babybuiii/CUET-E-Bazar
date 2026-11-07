const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const User = require('../models/User');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');
const { notify } = require('../utils/notify');

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/reports - Submit a report (students or shop owners)
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/', authenticate, async (req, res) => {
  try {
    const { targetType, targetId, reason, description, evidence = [] } = req.body;

    if (!targetType || !targetId || !reason || !description) {
      return res.status(400).json({
        success: false,
        message: 'Target type, target ID, reason, and description are required.'
      });
    }

    const validTargetTypes = ['product', 'shop', 'user', 'giveaway'];
    if (!validTargetTypes.includes(targetType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid target type. Must be one of: ${validTargetTypes.join(', ')}`
      });
    }

    const validReasons = [
      'scam',
      'fake_product',
      'harassment',
      'inappropriate_content',
      'price_gouging',
      'spam',
      'other'
    ];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: `Invalid report reason. Must be one of: ${validReasons.join(', ')}`
      });
    }

    // Verify target exists
    let targetExists = false;
    let targetTitle = '';
    if (targetType === 'product') {
      const p = await Product.findById(targetId).select('title');
      if (p) {
        targetExists = true;
        targetTitle = p.title;
      }
    } else if (targetType === 'shop') {
      const s = await Shop.findById(targetId).select('shopName');
      if (s) {
        targetExists = true;
        targetTitle = s.shopName;
      }
    } else if (targetType === 'user') {
      const u = await User.findById(targetId).select('fullName email');
      if (u) {
        targetExists = true;
        targetTitle = u.fullName || u.email;
      }
    } else {
      targetExists = true; // giveaway or other
    }

    if (!targetExists) {
      return res.status(404).json({
        success: false,
        message: `The reported ${targetType} could not be found.`
      });
    }

    // Prevent duplicate pending reports from same reporter on same target
    const existing = await Report.findOne({
      reporter: req.user._id,
      targetType,
      targetId,
      status: { $in: ['pending', 'under_review'] }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You already have an open report pending for this item.'
      });
    }

    const report = await Report.create({
      reporter: req.user._id,
      targetType,
      targetId,
      reason,
      description: description.trim(),
      evidence: Array.isArray(evidence) ? evidence.slice(0, 5) : []
    });

    // Notify administrators
    const admins = await User.find({ role: 'admin' }).select('_id');
    for (const admin of admins) {
      await notify({
        recipient: admin._id,
        type: 'new_report',
        title: 'New Moderation Report',
        message: `${req.user.fullName} reported ${targetType} "${targetTitle || targetId}" for: ${reason.replace('_', ' ')}`,
        linkType: 'report',
        linkId: report._id
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Our campus moderation team will review it.',
      reportId: report._id
    });
  } catch (err) {
    console.error('Submit report error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit report. Please try again later.'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/reports/my-reports - View reports submitted by current user
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/my-reports', authenticate, async (req, res) => {
  try {
    const reports = await Report.find({ reporter: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({
      success: true,
      reports
    });
  } catch (err) {
    console.error('Fetch my-reports error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch reports.' });
  }
});

module.exports = router;

