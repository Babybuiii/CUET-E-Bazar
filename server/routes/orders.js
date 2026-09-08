const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');
const { notifyOther } = require('../utils/notify');

const taka = (n) => `BDT ${Number(n || 0).toLocaleString()}`;

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/orders - Place an order on a product (notifies the seller)
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/', authenticate, async (req, res) => {
  try {
    const { productId, quantity = 1, buyerNotes = '', meetupLocation } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product is required to place an order.' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    if (product.status !== 'active') {
      return res.status(400).json({ success: false, message: 'This product is no longer available.' });
    }
    if (String(product.seller) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot order your own product.' });
    }

    const qty = Math.max(1, Number(quantity) || 1);
    if (product.stock !== undefined && product.stock !== null && qty > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} unit(s) of this product are in stock.`
      });
    }

    const order = await Order.create({
      buyer: req.user._id,
      seller: product.seller,
      product: product._id,
      shop: product.shop || null,
      quantity: qty,
      unitPrice: product.price,
      totalPrice: product.price * qty,
      buyerNotes: String(buyerNotes).slice(0, 500),
      meetupLocation: meetupLocation || product.location || 'CUET Campus'
    });

    await notifyOther({
      recipient: product.seller,
      actor: req.user._id,
      type: 'new_order',
      title: 'New order received',
      message: `${req.user.fullName} ordered ${qty} x "${product.title}" for ${taka(order.totalPrice)}.`,
      linkType: 'order',
      linkId: order._id
    });

    const populated = await Order.findById(order._id)
      .populate('product', 'title price images status')
      .populate('buyer', 'fullName userId avatarUrl')
      .populate('seller', 'fullName userId avatarUrl');

    return res.status(201).json({
      success: true,
      message: 'Order placed! The seller has been notified.',
      order: populated
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(' | ') });
    }
    console.error('Create order error:', err);
    return res.status(500).json({ success: false, message: 'Failed to place order.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/orders/received - Orders placed on the signed-in user's products
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/received', authenticate, async (req, res) => {
  try {
    const filter = { seller: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const orders = await Order.find(filter)
      .populate('product', 'title price images status')
      .populate('buyer', 'fullName userId avatarUrl contactNumber')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    console.error('Fetch received orders error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load orders.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/orders/placed - Orders the signed-in user placed
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/placed', authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .populate('product', 'title price images status')
      .populate('seller', 'fullName userId avatarUrl')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    console.error('Fetch placed orders error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load orders.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/orders/:id/status - Seller confirms/completes, either side cancels
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status, cancelReason = '' } = req.body;
    const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${allowed.join(', ')}`
      });
    }

    const order = await Order.findById(req.params.id).populate('product', 'title');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const isSeller = String(order.seller) === String(req.user._id);
    const isBuyer = String(order.buyer) === String(req.user._id);

    if (!isSeller && !isBuyer) {
      return res.status(403).json({ success: false, message: 'You cannot update this order.' });
    }
    // Buyers may only cancel; sellers drive the rest of the lifecycle
    if (!isSeller && status !== 'cancelled') {
      return res.status(403).json({ success: false, message: 'Only the seller can update the order status.' });
    }

    order.status = status;
    if (status === 'completed') order.completedAt = new Date();
    if (status === 'cancelled') {
      order.cancelledAt = new Date();
      order.cancelReason = String(cancelReason).slice(0, 500);
    }
    await order.save();

    // Tell the other party what happened
    await notifyOther({
      recipient: isSeller ? order.buyer : order.seller,
      actor: req.user._id,
      type: 'order_update',
      title: `Order ${status}`,
      message: `${req.user.fullName} marked the order for "${order.product?.title || 'a product'}" as ${status}.`,
      linkType: 'order',
      linkId: order._id
    });

    return res.json({ success: true, message: `Order marked as ${status}.`, order });
  } catch (err) {
    console.error('Update order status error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update order.' });
  }
});

module.exports = router;
