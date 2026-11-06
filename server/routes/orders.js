const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/orders/checkout - Place order from cart or direct item
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/checkout', authenticate, async (req, res) => {
  try {
    const { items, hall, room, contactNumber, notes } = req.body;

    if (!hall || !room || !contactNumber) {
      return res.status(400).json({
        success: false,
        message: 'Hall, Room number, and Contact Phone number are required for delivery.'
      });
    }

    const deliveryAddress = `${hall.trim()}, Room: ${room.trim()} • Phone: ${contactNumber.trim()}`;

    let orderItemsToProcess = [];

    // If items provided directly in request body
    if (Array.isArray(items) && items.length > 0) {
      orderItemsToProcess = items;
    } else {
      // Otherwise pull from user's persistent cart
      const cart = await Cart.findOne({ user: req.user._id });
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: 'Your shopping cart is empty.' });
      }
      orderItemsToProcess = cart.items.map((i) => ({
        productId: i.product.toString(),
        quantity: i.quantity
      }));
    }

    const createdOrders = [];
    const orderedProductIds = [];

    for (const item of orderItemsToProcess) {
      const product = await Product.findById(item.productId);
      if (!product) continue;

      // Ensure item is a campus shop product
      if (!product.shop && product.sellerType !== 'shop') {
        return res.status(400).json({
          success: false,
          message: `"${product.title}" is listed by an individual seller. Cart checkout and delivery are only available for campus shop products.`
        });
      }

      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const unitPrice = Number(product.price) || 0;
      const totalPrice = unitPrice * qty;

      const newOrder = await Order.create({
        buyer: req.user._id,
        seller: product.seller,
        product: product._id,
        shop: product.shop || null,
        quantity: qty,
        unitPrice,
        totalPrice,
        status: 'pending',
        buyerNotes: notes ? notes.trim() : '',
        meetupLocation: deliveryAddress
      });

      createdOrders.push(newOrder);
      orderedProductIds.push(product._id.toString());
    }

    if (createdOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Could not create order. Products may no longer be available.'
      });
    }

    // Clean up purchased items from the user's cart
    const userCart = await Cart.findOne({ user: req.user._id });
    if (userCart) {
      userCart.items = userCart.items.filter(
        (ci) => !orderedProductIds.includes(ci.product?.toString())
      );
      await userCart.save();
    }

    const populatedOrders = await Order.find({ _id: { $in: createdOrders.map((o) => o._id) } })
      .populate('product', 'title price images category condition')
      .populate('shop', 'shopName slug location contactNumber')
      .populate('seller', 'fullName contactNumber email');

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully! Payment will be handled manually on delivery.',
      orders: populatedOrders
    });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ success: false, message: 'Failed to place order.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/orders/my-orders - View student's own placed orders
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/my-orders', authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .populate('product', 'title price images category condition location status')
      .populate('shop', 'shopName slug location contactNumber isVerified')
      .populate('seller', 'fullName contactNumber email avatarUrl department hall')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (err) {
    console.error('Fetch my-orders error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch your orders.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/orders/shop-orders - For shop owners/sellers to view incoming orders
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/shop-orders', authenticate, async (req, res) => {
  try {
    const queryConditions = [{ seller: req.user._id }];
    if (req.user.shop) {
      queryConditions.push({ shop: req.user.shop });
    }

    const orders = await Order.find({ $or: queryConditions })
      .populate('buyer', 'fullName contactNumber email department hall avatarUrl studentId')
      .populate('product', 'title price images category condition')
      .populate('shop', 'shopName slug location')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (err) {
    console.error('Fetch shop-orders error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch incoming orders.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/orders/:id/status - Update order status (confirm, complete, cancel)
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status, cancelReason } = req.body;
    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const isSeller = order.seller.toString() === req.user._id.toString();
    const isBuyer = order.buyer.toString() === req.user._id.toString();
    const isShopOwner = req.user.shop && order.shop && req.user.shop.toString() === order.shop.toString();
    const isAdmin = req.user.role === 'admin';

    // Buyer can only cancel if still pending
    if (isBuyer && !isSeller && !isShopOwner && !isAdmin) {
      if (status !== 'cancelled' || order.status !== 'pending') {
        return res.status(403).json({
          success: false,
          message: 'You can only cancel orders that are still pending.'
        });
      }
    } else if (!isSeller && !isShopOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this order.' });
    }

    order.status = status;
    if (status === 'completed') {
      order.completedAt = new Date();
    } else if (status === 'cancelled') {
      order.cancelledAt = new Date();
      if (cancelReason) order.cancelReason = cancelReason.trim();
    }

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('buyer', 'fullName contactNumber email department hall')
      .populate('product', 'title price images category condition')
      .populate('shop', 'shopName slug location')
      .populate('seller', 'fullName contactNumber email');

    return res.json({
      success: true,
      message: `Order marked as ${status}.`,
      order: populatedOrder
    });
  } catch (err) {
    console.error('Update order status error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update order.' });
  }
});

module.exports = router;
