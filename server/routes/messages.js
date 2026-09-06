const express = require('express');
const router = express.Router();
const { Conversation, Message } = require('../models/Message');
const User = require('../models/User');
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/messages/conversations - List all conversations for authenticated user
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate('participants', 'fullName userId department hall avatarUrl isVerified rating role')
      .populate('product', 'title price images status condition location')
      .sort({ updatedAt: -1, 'lastMessage.sentAt': -1 });

    return res.json({
      success: true,
      currentUserId: req.user._id.toString(),
      conversations
    });
  } catch (err) {
    console.error('Fetch conversations error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load conversations.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/messages/start - Find or create a conversation with a seller/user
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/start', authenticate, async (req, res) => {
  try {
    const { recipientId, productId, initialText } = req.body;
    const mongoose = require('mongoose');

    if (!recipientId) {
      return res.status(400).json({ success: false, message: 'Recipient ID is required.' });
    }

    if (recipientId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        isSelf: true,
        message: 'This is your own product listing.'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ success: false, message: 'Invalid recipient ID provided.' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient user not found.' });
    }

    const validProductId = productId && mongoose.Types.ObjectId.isValid(productId) ? productId : null;

    // Try finding existing conversation between these 2 users (prioritizing product match if present)
    let conversation = null;
    if (validProductId) {
      conversation = await Conversation.findOne({
        participants: { $all: [req.user._id, recipientId] },
        product: validProductId
      })
        .populate('participants', 'fullName userId department hall avatarUrl isVerified rating role')
        .populate('product', 'title price images status condition location');
    }

    if (!conversation) {
      conversation = await Conversation.findOne({
        participants: { $all: [req.user._id, recipientId] }
      })
        .populate('participants', 'fullName userId department hall avatarUrl isVerified rating role')
        .populate('product', 'title price images status condition location');
    }

    // If still not found, create new conversation
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, recipientId],
        product: validProductId,
        lastMessage: {
          text: initialText || 'No messages yet',
          sender: req.user._id,
          sentAt: new Date()
        }
      });

      if (initialText) {
        await Message.create({
          conversation: conversation._id,
          sender: req.user._id,
          text: initialText
        });
      }

      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'fullName userId department hall avatarUrl isVerified rating role')
        .populate('product', 'title price images status condition location');
    } else if (initialText) {
      // If conversation already existed and initialText was sent, record the new message
      await Message.create({
        conversation: conversation._id,
        sender: req.user._id,
        text: initialText
      });
      conversation.lastMessage = {
        text: initialText,
        sender: req.user._id,
        sentAt: new Date()
      };
      await conversation.save();
    }

    return res.json({
      success: true,
      conversation
    });
  } catch (err) {
    console.error('Start conversation error:', err);
    return res.status(500).json({ success: false, message: 'Failed to start conversation.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/messages/:conversationId - Get all messages for a conversation
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:conversationId', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'fullName userId department hall avatarUrl isVerified rating role')
      .populate('product', 'title price images status condition location');

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    // Check membership
    const isParticipant = conversation.participants.some(
      (p) => p._id.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this chat.' });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'fullName userId avatarUrl')
      .sort({ createdAt: 1 });

    // Mark unread messages sent to this user as read
    await Message.updateMany(
      { conversation: conversationId, sender: { $ne: req.user._id }, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return res.json({
      success: true,
      currentUserId: req.user._id.toString(),
      conversation,
      messages
    });
  } catch (err) {
    console.error('Fetch messages error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load messages.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/messages/:conversationId - Send a new message
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:conversationId', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text cannot be empty.' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const isParticipant = conversation.participants.some(
      (pId) => pId.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Unauthorized to message in this chat.' });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      text: text.trim()
    });

    // Update lastMessage on conversation
    conversation.lastMessage = {
      text: text.trim(),
      sender: req.user._id,
      sentAt: new Date()
    };
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'fullName userId avatarUrl');

    return res.status(201).json({
      success: true,
      message: populatedMessage
    });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
});

module.exports = router;
