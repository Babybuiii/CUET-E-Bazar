const express = require('express');
const router = express.Router();
const Query = require('../models/Query');
const Product = require('../models/Product');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/queries/product/:productId - Get all public questions & answers
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const queries = await Query.find({ product: productId })
      .populate('asker', 'fullName avatarUrl department hall isVerified role')
      .populate('answers.answerer', 'fullName avatarUrl department hall isVerified role')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: queries.length,
      queries
    });
  } catch (err) {
    console.error('Fetch product queries error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load public questions.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/queries/product/:productId - Ask a public question
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/product/:productId', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'Question cannot be empty.' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const newQuery = await Query.create({
      asker: req.user._id,
      product: productId,
      question: question.trim(),
      answers: []
    });

    // Update queryCount on product
    await Product.findByIdAndUpdate(productId, { $inc: { queryCount: 1 } });

    const populatedQuery = await Query.findById(newQuery._id)
      .populate('asker', 'fullName avatarUrl department hall isVerified role')
      .lean();

    return res.status(201).json({
      success: true,
      message: 'Question posted publicly!',
      query: populatedQuery
    });
  } catch (err) {
    console.error('Post query error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit question.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/queries/:queryId/answers - Post an answer / reply to a question
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:queryId/answers', authenticate, async (req, res) => {
  try {
    const { queryId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Answer text cannot be empty.' });
    }

    const query = await Query.findById(queryId).populate('product');
    if (!query) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    // Determine if the current user is the product seller or shop owner
    const product = query.product;
    let isSellerAnswer = false;

    if (product) {
      const sellerIdStr = product.seller ? product.seller.toString() : '';
      const userIdStr = req.user._id.toString();

      if (sellerIdStr === userIdStr) {
        isSellerAnswer = true;
      } else if (req.user.shop && product.shop && req.user.shop.toString() === product.shop.toString()) {
        isSellerAnswer = true;
      }
    }

    query.answers.push({
      answerer: req.user._id,
      text: text.trim(),
      isSellerAnswer,
      createdAt: new Date()
    });

    await query.save();

    const updatedQuery = await Query.findById(query._id)
      .populate('asker', 'fullName avatarUrl department hall isVerified role')
      .populate('answers.answerer', 'fullName avatarUrl department hall isVerified role')
      .lean();

    return res.json({
      success: true,
      message: 'Reply posted successfully!',
      query: updatedQuery
    });
  } catch (err) {
    console.error('Post answer error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit reply.' });
  }
});

module.exports = router;
