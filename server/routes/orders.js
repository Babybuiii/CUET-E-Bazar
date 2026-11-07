const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');
const { notifyOther } = require('../utils/notify');

const taka = (n) => `BDT ${Number(n || 0).toLocaleString()}`;

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/orders - Place a direct order on a single product (notifies the seller)
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
      .populate('product', 'title price images status category condition')
      .populate('shop', 'shopName slug location')
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
// POST /api/orders/checkout - Place order from cart or direct items
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

      createdOrders.push({ order: newOrder, product });
      orderedProductIds.push(product._id.toString());

      // Notify seller of incoming order
      await notifyOther({
        recipient: product.seller,
        actor: req.user._id,
        type: 'new_order',
        title: 'New order received',
        message: `${req.user.fullName} placed an order for ${qty} x "${product.title}" (${taka(totalPrice)}). Delivery: ${deliveryAddress}`,
        linkType: 'order',
        linkId: newOrder._id
      });
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

    // ── Notify shop owners about new orders ────────────────────────────────────
    try {
      const buyer = await User.findById(req.user._id).select('fullName avatarUrl');
      // Group by shop owner to send one notification per shop per checkout
      const ownerNotifMap = {};
      for (const { order, product } of createdOrders) {
        if (!product.seller) continue;
        const ownerKey = product.seller.toString();
        if (!ownerNotifMap[ownerKey]) {
          ownerNotifMap[ownerKey] = { ownerId: product.seller, items: [], orderId: order._id };
        }
        ownerNotifMap[ownerKey].items.push({ title: product.title, qty: order.quantity });
        ownerNotifMap[ownerKey].totalAmount = (ownerNotifMap[ownerKey].totalAmount || 0) + order.totalPrice;
      }

      for (const ownerKey of Object.keys(ownerNotifMap)) {
        const { ownerId, items, orderId, totalAmount } = ownerNotifMap[ownerKey];
        const itemsSummary = items.map(i => `${i.qty}x ${i.title}`).join(', ');
        const buyerName = buyer?.fullName || 'A student';

        await Notification.create({
          recipient: ownerId,
          type: 'new_order',
          title: 'New Order Received!',
          message: `${buyerName} placed an order for ${itemsSummary}. Total: ৳${totalAmount}.`,
          linkType: 'order',
          linkId: orderId,
          metadata: {
            buyerId: req.user._id,
            buyerName: buyer?.fullName,
            buyerAvatar: buyer?.avatarUrl,
            items,
            totalAmount
          }
        });
      }
    } catch (notifErr) {
      console.warn('Order notification error (non-fatal):', notifErr.message);
    }

    const orderIds = createdOrders.map(({ order }) => order._id);
    const populatedOrders = await Order.find({ _id: { $in: orderIds } })
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
// GET /api/orders/my-orders (and aliases /mine, /placed) - View placed orders
// ═══════════════════════════════════════════════════════════════════════════════
const handleGetPlacedOrders = async (req, res) => {
  try {
    const filter = { buyer: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const orders = await Order.find(filter)
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
    console.error('Fetch placed orders error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch your orders.' });
  }
};

router.get('/my-orders', authenticate, handleGetPlacedOrders);
router.get('/mine', authenticate, handleGetPlacedOrders);
router.get('/placed', authenticate, handleGetPlacedOrders);

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/orders/shop-orders (and aliases /received, /as-seller) - Incoming orders
// ═══════════════════════════════════════════════════════════════════════════════
const handleGetReceivedOrders = async (req, res) => {
  try {
    // Find the shop owned by this user
    const shop = await Shop.findOne({ owner: req.user._id }).select('_id');
    const queryConditions = [{ seller: req.user._id }];
    if (shop) {
      queryConditions.push({ shop: shop._id });
    } else if (req.user.shop) {
      queryConditions.push({ shop: req.user.shop });
    }

    const { status } = req.query;
    let filter = { $or: queryConditions };
    if (status && status !== 'all') {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate('buyer', 'fullName contactNumber email department hall avatarUrl studentId userId')
      .populate('product', 'title price images category condition status')
      .populate('shop', 'shopName slug location')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (err) {
    console.error('Fetch incoming orders error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch incoming orders.' });
  }
};

router.get('/shop-orders', authenticate, handleGetReceivedOrders);
router.get('/received', authenticate, handleGetReceivedOrders);
router.get('/as-seller', authenticate, handleGetReceivedOrders);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/orders/:id/status - Update order status (confirm, complete, cancel, etc.)
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status, cancelReason } = req.body;
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status.' });
    }

    const order = await Order.findById(req.params.id).populate('product', 'title');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Find shop for ownership check
    const shop = await Shop.findOne({ owner: req.user._id }).select('_id');
    const isSeller = order.seller.toString() === req.user._id.toString();
    const isBuyer = order.buyer.toString() === req.user._id.toString();
    const isShopOwner = shop && order.shop && shop._id.toString() === order.shop.toString();
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

    const previousStatus = order.status;
    order.status = status;
    if (status === 'completed') {
      order.completedAt = new Date();
    } else if (status === 'cancelled') {
      order.cancelledAt = new Date();
      if (cancelReason) order.cancelReason = String(cancelReason).slice(0, 500).trim();
    }

    await order.save();

    // Notify about order status change
    try {
      if (previousStatus !== status && (isShopOwner || isSeller || isAdmin)) {
        const statusLabels = {
          confirmed: 'Your order has been confirmed!',
          preparing: 'Your order is being prepared.',
          ready_for_pickup: 'Your order is ready for pickup!',
          completed: 'Your order has been completed.',
          cancelled: 'Your order has been cancelled.'
        };
        const label = statusLabels[status] || `Your order status changed to ${status}.`;
        await notifyOther({
          recipient: isSeller || isShopOwner ? order.buyer : order.seller,
          actor: req.user._id,
          type: 'order_update',
          title: `Order ${status.replace(/_/g, ' ')}`,
          message: label + (cancelReason ? ` Reason: ${cancelReason}` : ''),
          linkType: 'order',
          linkId: order._id
        });
      }
    } catch (notifErr) {
      console.warn('Status notification error (non-fatal):', notifErr.message);
    }

    const populatedOrder = await Order.findById(order._id)
      .populate('buyer', 'fullName contactNumber email department hall avatarUrl')
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
