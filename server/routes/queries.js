const express = require('express');
const router = express.Router();
const Query = require('../models/Query');
const Product = require('../models/Product');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { notifyOther } = require('../utils/notify');

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/queries/received - Questions on the signed-in user's products
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/received', authenticate, async (req, res) => {
  try {
    const myProducts = await Product.find({ seller: req.user._id }).select('_id');
    const ids = myProducts.map((p) => p._id);

    const queries = await Query.find({ product: { $in: ids } })
      .populate('asker', 'fullName userId avatarUrl department hall isVerified role')
      .populate('product', 'title images price')
      .populate('answers.answerer', 'fullName userId avatarUrl department hall isVerified role')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({
      success: true,
      count: queries.length,
      unansweredCount: queries.filter((q) => q.answers.length === 0).length,
      queries
    });
  } catch (err) {
    console.error('Fetch received queries error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load received questions.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/queries/product/:productId - Public Q&A thread for a product
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
// POST /api/queries/product/:productId - Ask a public question (notifies seller)
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
      product: productId,
      asker: req.user._id,
      question: question.trim(),
      answers: []
    });

    // Notify seller
    await notifyOther({
      recipient: product.seller,
      actor: req.user._id,
      type: 'new_query',
      title: 'New question on your listing',
      message: `${req.user.fullName} asked on "${product.title}": ${question.trim()}`,
      linkType: 'query',
      linkId: newQuery._id
    });

    const populatedQuery = await Query.findById(newQuery._id)
      .populate('asker', 'fullName avatarUrl department hall isVerified role')
      .populate('answers.answerer', 'fullName avatarUrl department hall isVerified role')
      .lean();

    return res.status(201).json({
      success: true,
      message: 'Question posted successfully! The seller has been notified.',
      query: populatedQuery
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(' | ') });
    }
    console.error('Post query error:', err);
    return res.status(500).json({ success: false, message: 'Failed to post question.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Helper handler for answering a question
// ═══════════════════════════════════════════════════════════════════════════════
const handleAnswerQuery = async (req, res) => {
  try {
    const queryId = req.params.queryId || req.params.id;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Answer text cannot be empty.' });
    }

    const query = await Query.findById(queryId).populate('product', 'title seller shop');
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

    if (isSellerAnswer) {
      query.isResolved = true;
    }

    await query.save();

    // Notify the question asker
    await notifyOther({
      recipient: query.asker,
      actor: req.user._id,
      type: 'new_answer',
      title: isSellerAnswer ? 'The seller answered your question' : 'New answer to your question',
      message: `On "${query.product?.title || 'a product'}": ${text.trim()}`,
      linkType: 'query',
      linkId: query._id
    });

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
};

router.post('/:queryId/answers', authenticate, handleAnswerQuery);
router.post('/:id/answer', authenticate, handleAnswerQuery);

module.exports = router;
