const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');

// Helper to populate and compute totals for a cart
async function getPopulatedCart(userId) {
  let cart = await Cart.findOne({ user: userId }).populate({
    path: 'items.product',
    select: 'title price originalPrice discount images condition status stock shop location seller',
    populate: [
      { path: 'shop', select: 'shopName slug location isVerified' },
      { path: 'seller', select: 'fullName email contactNumber' }
    ]
  });

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }

  // Filter out any items where product might have been deleted
  const validItems = cart.items.filter((item) => item.product !== null && item.product !== undefined);
  if (validItems.length !== cart.items.length) {
    cart.items = validItems;
    await cart.save();
  }

  let totalItems = 0;
  let subtotal = 0;

  validItems.forEach((item) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.product?.price) || 0;
    totalItems += qty;
    subtotal += price * qty;
  });

  return {
    _id: cart._id,
    user: cart.user,
    items: validItems,
    totalItems,
    subtotal
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/cart - Get current user's cart
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/', authenticate, async (req, res) => {
  try {
    const cart = await getPopulatedCart(req.user._id);
    return res.json({ success: true, cart });
  } catch (err) {
    console.error('Fetch cart error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch shopping cart.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/cart/add - Add product to cart
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/add', authenticate, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    if (product.status === 'sold') {
      return res.status(400).json({ success: false, message: 'This product has already been sold.' });
    }

    // Add to cart is only available for campus shop products, not individual sellers
    const isShopProduct = Boolean(product.shop || product.sellerType === 'shop');
    if (!isShopProduct) {
      return res.status(400).json({
        success: false,
        message: 'Add to cart is only available for campus shop products. Individual seller items are arranged via direct chat.'
      });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    const addQty = Math.max(1, parseInt(quantity, 10) || 1);
    const existingIndex = cart.items.findIndex(
      (item) => item.product && item.product.toString() === productId.toString()
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += addQty;
    } else {
      cart.items.push({
        product: product._id,
        shop: product.shop || null,
        quantity: addQty
      });
    }

    await cart.save();

    const populatedCart = await getPopulatedCart(req.user._id);
    return res.json({
      success: true,
      message: `${product.title} added to cart!`,
      cart: populatedCart
    });
  } catch (err) {
    console.error('Add to cart error:', err);
    return res.status(500).json({ success: false, message: 'Failed to add item to cart.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/cart/item/:itemId - Update item quantity in cart
// ═══════════════════════════════════════════════════════════════════════════════
router.put('/item/:itemId', authenticate, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found.' });
    }

    const targetIndex = cart.items.findIndex((item) => item._id.toString() === itemId);
    if (targetIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not found in cart.' });
    }

    const newQty = parseInt(quantity, 10);
    if (isNaN(newQty) || newQty <= 0) {
      cart.items.splice(targetIndex, 1);
    } else {
      cart.items[targetIndex].quantity = newQty;
    }

    await cart.save();

    const populatedCart = await getPopulatedCart(req.user._id);
    return res.json({
      success: true,
      message: 'Cart updated',
      cart: populatedCart
    });
  } catch (err) {
    console.error('Update cart item error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update cart item.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/cart/item/:itemId - Remove item from cart
// ═══════════════════════════════════════════════════════════════════════════════
router.delete('/item/:itemId', authenticate, async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found.' });
    }

    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);
    await cart.save();

    const populatedCart = await getPopulatedCart(req.user._id);
    return res.json({
      success: true,
      message: 'Item removed from cart',
      cart: populatedCart
    });
  } catch (err) {
    console.error('Delete cart item error:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove item.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/cart/clear - Clear all items from cart
// ═══════════════════════════════════════════════════════════════════════════════
router.delete('/clear', authenticate, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    return res.json({
      success: true,
      message: 'Cart cleared successfully',
      cart: { items: [], totalItems: 0, subtotal: 0 }
    });
  } catch (err) {
    console.error('Clear cart error:', err);
    return res.status(500).json({ success: false, message: 'Failed to clear cart.' });
  }
});

module.exports = router;
