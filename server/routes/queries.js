const express = require('express');
const router = express.Router();
const Query = require('../models/Query');
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');
const { notifyOther } = require('../utils/notify');

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/queries/product/:productId - Public Q&A thread for a product
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/product/:productId', async (req, res) => {
  try {
    const queries = await Query.find({ product: req.params.productId })
      .populate('asker', 'fullName userId avatarUrl')
      .populate('answers.answerer', 'fullName userId avatarUrl')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: queries.length, queries });
  } catch (err) {
    console.error('Fetch queries error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load questions.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/queries/received - Questions on the signed-in user's products
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/received', authenticate, async (req, res) => {
  try {
    const myProducts = await Product.find({ seller: req.user._id }).select('_id');
    const ids = myProducts.map((p) => p._id);

    const queries = await Query.find({ product: { $in: ids } })
      .populate('asker', 'fullName userId avatarUrl')
      .populate('product', 'title images price')
      .populate('answers.answerer', 'fullName userId avatarUrl')
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
    return res.status(500).json({ success: false, message: 'Failed to load questions.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/queries - Ask a question about a product (notifies the seller)
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/', authenticate, async (req, res) => {
  try {
    const { productId, question } = req.body;

    if (!productId || !question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'Product and question are required.' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    if (String(product.seller) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot ask a question on your own product.' });
    }

    const query = await Query.create({
      asker: req.user._id,
      product: product._id,
      question: question.trim()
    });

    await notifyOther({
      recipient: product.seller,
      actor: req.user._id,
      type: 'new_query',
      title: 'New question on your product',
      message: `${req.user.fullName} asked about "${product.title}": ${question.trim()}`,
      linkType: 'query',
      linkId: query._id
    });

    const populated = await Query.findById(query._id).populate('asker', 'fullName userId avatarUrl');

    return res.status(201).json({
      success: true,
      message: 'Question posted! The seller has been notified.',
      query: populated
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(' | ') });
    }
    console.error('Create query error:', err);
    return res.status(500).json({ success: false, message: 'Failed to post question.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/queries/:id/answer - Answer a question (notifies the asker)
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:id/answer', authenticate, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Answer text is required.' });
    }

    const query = await Query.findById(req.params.id).populate('product', 'title seller');
    if (!query) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    const isSeller = String(query.product?.seller) === String(req.user._id);

    query.answers.push({
      answerer: req.user._id,
      text: text.trim(),
      isSellerAnswer: isSeller
    });
    if (isSeller) query.isResolved = true;
    await query.save();

    await notifyOther({
      recipient: query.asker,
      actor: req.user._id,
      type: 'new_answer',
      title: isSeller ? 'The seller answered your question' : 'New answer to your question',
      message: `On "${query.product?.title || 'a product'}": ${text.trim()}`,
      linkType: 'query',
      linkId: query._id
    });

    const populated = await Query.findById(query._id)
      .populate('asker', 'fullName userId avatarUrl')
      .populate('answers.answerer', 'fullName userId avatarUrl');

    return res.json({ success: true, message: 'Answer posted!', query: populated });
  } catch (err) {
    console.error('Answer query error:', err);
    return res.status(500).json({ success: false, message: 'Failed to post answer.' });
  }
});

module.exports = router;
