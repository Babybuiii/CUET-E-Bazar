/**
 * giveawayController.js
 *
 * Full controller for the Giveaways feature — First Come, First Served (FCFS).
 * Integrates with the existing:
 *   - User model (isVerified, isBanned, role, fullName, department)
 *   - Conversation / Message models (server/models/Message.js)
 *   - Cloudinary config (server/config/cloudinary.js)
 *   - authenticate middleware (server/middleware/auth.js)
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Giveaway = require('../models/Giveaway');
const Notification = require('../models/Notification');
const { Conversation, Message } = require('../models/Message');
const {
  GIVEAWAY_CATEGORIES,
  GIVEAWAY_CONDITIONS,
  GIVEAWAY_LOCATIONS
} = require('../models/Giveaway');

// ── Duration map ─────────────────────────────────────────────────────────────
const DURATION_MAP = {
  '24h':  24 * 60 * 60 * 1000,
  '3d':   3  * 24 * 60 * 60 * 1000,
  '7d':   7  * 24 * 60 * 60 * 1000
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/giveaways
//    Public — lists active & claimed giveaways
// ─────────────────────────────────────────────────────────────────────────────
const getGiveaways = async (req, res) => {
  try {
    const {
      category,
      location,
      search,
      hideClaimed = 'false',
      limit = 50
    } = req.query;

    const filter = {
      deadline: { $gt: new Date() },
      status:   { $nin: ['expired', 'cancelled'] }
    };

    if (hideClaimed === 'true') {
      filter.status = 'available';
    }

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (location && location !== 'All') {
      filter.location = location;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title:       { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { category:    { $regex: q, $options: 'i' } }
      ];
    }

    // Optionally exclude the authenticated user's own giveaways if excludeOwn is requested
    if (req.query.excludeOwn === 'true' && req.user && req.user._id) {
      filter.donor = { $ne: req.user._id };
    }

    const giveaways = await Giveaway.find(filter)
      .populate('donor',        'fullName userId department hall avatarUrl isVerified')
      .populate('selectedUser', 'fullName userId department hall avatarUrl isVerified')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    return res.json({
      success: true,
      count:   giveaways.length,
      giveaways
    });
  } catch (err) {
    console.error('getGiveaways error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch giveaways.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /api/giveaways/:id
//    Public — full detail of single giveaway
// ─────────────────────────────────────────────────────────────────────────────
const getGiveawayById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid giveaway ID.' });
    }

    const giveaway = await Giveaway.findById(id)
      .populate('donor',        'fullName userId department hall avatarUrl isVerified')
      .populate('selectedUser', 'fullName userId department hall avatarUrl isVerified')
      .lean();

    if (!giveaway) {
      return res.status(404).json({ success: false, message: 'Giveaway not found.' });
    }

    return res.json({ success: true, giveaway });
  } catch (err) {
    console.error('getGiveawayById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch giveaway.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /api/giveaways
//    Create a giveaway listing
//    Requires authenticate + requireGiveawayEligibility
// ─────────────────────────────────────────────────────────────────────────────
const createGiveaway = async (req, res) => {
  try {
    const {
      title,
      description = '',
      category    = 'Others',
      condition   = 'Good',
      location    = 'CUET Campus',
      pickupSpot  = '',
      duration    = '7d'
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Item title is required.' });
    }
    if (title.trim().length > 120) {
      return res.status(400).json({ success: false, message: 'Title cannot exceed 120 characters.' });
    }
    if (description.length > 1000) {
      return res.status(400).json({ success: false, message: 'Description cannot exceed 1000 characters.' });
    }
    if (!GIVEAWAY_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: `Invalid category. Allowed: ${GIVEAWAY_CATEGORIES.join(', ')}.` });
    }
    if (!GIVEAWAY_CONDITIONS.includes(condition)) {
      return res.status(400).json({ success: false, message: `Invalid condition. Allowed: ${GIVEAWAY_CONDITIONS.join(', ')}.` });
    }
    if (!GIVEAWAY_LOCATIONS.includes(location)) {
      return res.status(400).json({ success: false, message: `Invalid location. Allowed: ${GIVEAWAY_LOCATIONS.join(', ')}.` });
    }
    if (!DURATION_MAP[duration]) {
      return res.status(400).json({ success: false, message: 'Duration must be one of: 24h, 3d, 7d.' });
    }

    const deadline = new Date(Date.now() + DURATION_MAP[duration]);

    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((f) => f.path || f.secure_url || f.url || '').filter(Boolean);
    }

    const giveaway = await Giveaway.create({
      title:       title.trim(),
      description: description.trim(),
      category,
      condition,
      location,
      pickupSpot:  pickupSpot.trim(),
      deadline,
      images,
      donor:       req.user._id,
      status:      'available'
    });

    const populated = await Giveaway.findById(giveaway._id)
      .populate('donor', 'fullName userId department hall avatarUrl isVerified');

    return res.status(201).json({
      success:  true,
      message:  'Giveaway published successfully!',
      giveaway: populated
    });
  } catch (err) {
    console.error('createGiveaway error:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(' | ') });
    }
    return res.status(500).json({ success: false, message: 'Failed to create giveaway.' });
  }
};

/**
 * Helper to retrieve or create a 2-participant conversation between donor and claimant
 */
const findOrCreateGiveawayConversation = async (giveaway, senderId, isClaimant) => {
  const donorId    = (giveaway.donor?._id || giveaway.donor).toString();
  const claimantId = (giveaway.selectedUser?._id || giveaway.selectedUser).toString();

  // 1. Check if a conversation already exists for this giveaway
  let conversation = await Conversation.findOne({
    participants: { $all: [donorId, claimantId] },
    giveaway:     giveaway._id
  });

  // 2. Fallback: check if a general conversation exists between these 2 users
  if (!conversation) {
    conversation = await Conversation.findOne({
      participants: { $all: [donorId, claimantId] },
      product:      null
    });

    if (conversation && !conversation.giveaway) {
      conversation.giveaway = giveaway._id;
      await conversation.save();
    }
  }

  // 3. Create new conversation if none exists yet
  if (!conversation) {
    const initialText = isClaimant
      ? `Hi ${giveaway.donor?.fullName || 'there'}! I claimed your giveaway "${giveaway.title}". I would like to coordinate pickup.`
      : `Hi ${giveaway.selectedUser?.fullName || 'there'}! Thank you for claiming "${giveaway.title}". Let's arrange pickup.`;

    try {
      conversation = await Conversation.create({
        participants: [donorId, claimantId],
        giveaway:     giveaway._id,
        product:      null,
        lastMessage: {
          text:   initialText,
          sender: senderId,
          sentAt: new Date()
        }
      });

      await Message.create({
        conversation: conversation._id,
        sender:       senderId,
        text:         initialText
      });
    } catch (createErr) {
      // Concurrency fallback
      conversation = await Conversation.findOne({
        participants: { $all: [donorId, claimantId] }
      });
      if (!conversation) throw createErr;
    }
  }

  return conversation;
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. POST /api/giveaways/:id/claim
//    Requires authenticate + requireGiveawayEligibility
//    First Come, First Served (FCFS) atomic claim
// ─────────────────────────────────────────────────────────────────────────────
const claimGiveaway = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid giveaway ID.' });
    }

    const giveaway = await Giveaway.findById(id);
    if (!giveaway) {
      return res.status(404).json({ success: false, message: 'Giveaway not found.' });
    }

    // 1. Prevent donor from claiming their own item
    if (giveaway.donor.toString() === userId.toString()) {
      return res.status(403).json({ success: false, message: 'You cannot claim your own giveaway.' });
    }

    // 2. Pre-check status
    if (giveaway.status === 'pending' || giveaway.status === 'claimed') {
      if (giveaway.selectedUser && giveaway.selectedUser.toString() === userId.toString()) {
        return res.status(409).json({ success: false, message: 'You have already requested to claim this giveaway.' });
      }
      return res.status(409).json({ success: false, message: 'This item has already been requested or claimed by another student.' });
    }

    if (['expired', 'cancelled'].includes(giveaway.status)) {
      return res.status(409).json({
        success: false,
        message: `This giveaway is ${giveaway.status} and no longer accepts claims.`
      });
    }

    if (new Date(giveaway.deadline) <= new Date()) {
      return res.status(409).json({ success: false, message: 'The giveaway deadline has passed.' });
    }

    if (giveaway.status !== 'available') {
      return res.status(409).json({ success: false, message: 'This item is not available for claiming.' });
    }

    // 3. Atomic claim update: transitions to 'pending' awaiting donor approval
    const claimed = await Giveaway.findOneAndUpdate(
      {
        _id:          id,
        status:       'available',
        selectedUser: null,
        deadline:     { $gt: new Date() }
      },
      {
        $set: {
          status:       'pending',
          selectedUser: userId,
          claimedAt:    new Date()
        },
        $inc: {
          claimedCount: 1
        }
      },
      { new: true }
    )
      .populate('donor',        'fullName userId department hall avatarUrl isVerified')
      .populate('selectedUser', 'fullName userId department hall avatarUrl isVerified');

    if (!claimed) {
      return res.status(409).json({
        success: false,
        message: 'Another student just claimed this item. It is no longer available.'
      });
    }

    // 4. Create or link the donor-claimant conversation
    let conversation = null;
    try {
      conversation = await findOrCreateGiveawayConversation(claimed, userId, true);
      if (conversation && !claimed.conversation) {
        claimed.conversation = conversation._id;
        await claimed.save();
      }
    } catch (convErr) {
      console.warn('Giveaway auto-conversation error:', convErr.message);
    }

    // 5. Notify the donor that their giveaway was claimed
    try {
      const claimantUser = claimed.selectedUser;
      const claimantName = claimantUser?.fullName || 'A CUET student';
      await Notification.create({
        recipient: claimed.donor._id || claimed.donor,
        type:      'giveaway_claimed',
        title:     'Giveaway Claim Requested!',
        message:   `Your giveaway item "${claimed.title}" has been requested by ${claimantName}. Please approve the claim.`,
        linkType:  'giveaway',
        linkId:    claimed._id,
        claimant:  userId,
        metadata: {
          giveawayId:         claimed._id,
          giveawayTitle:      claimed.title,
          giveawayImage:      claimed.images?.[0] || null,
          claimantName:       claimantUser?.fullName || 'CUET Student',
          claimantAvatar:     claimantUser?.avatarUrl || null,
          claimantDepartment: claimantUser?.department || null,
          claimantUserId:     claimantUser?.userId || null,
          location:           claimed.location,
          pickupSpot:         claimed.pickupSpot,
          conversationId:     conversation?._id || null
        }
      });
    } catch (notifErr) {
      console.error('Failed to create donor notification on claim:', notifErr.message);
    }

    return res.json({
      success:        true,
      message:        'Claim request submitted! Status is pending until approved by the owner.',
      giveaway:       claimed,
      conversationId: conversation?._id || null
    });
  } catch (err) {
    console.error('claimGiveaway error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process claim.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. POST /api/giveaways/:id/contact
//    Direct messaging between donor and claimant
//    Requires authenticate
// ─────────────────────────────────────────────────────────────────────────────
const initiateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid giveaway ID.' });
    }

    const giveaway = await Giveaway.findById(id)
      .populate('donor',        'fullName userId department hall avatarUrl isVerified')
      .populate('selectedUser', 'fullName userId department hall avatarUrl isVerified');

    if (!giveaway) {
      return res.status(404).json({ success: false, message: 'Giveaway not found.' });
    }

    if (!['pending', 'claimed'].includes(giveaway.status) || !giveaway.selectedUser) {
      return res.status(409).json({
        success: false,
        message: 'Direct messaging is only available for claimed or pending giveaways.'
      });
    }

    const donorId    = (giveaway.donor?._id || giveaway.donor).toString();
    const claimantId = (giveaway.selectedUser?._id || giveaway.selectedUser).toString();
    const myId       = userId.toString();

    const isDonor    = myId === donorId;
    const isClaimant = myId === claimantId;
    const isAdmin    = req.user.role === 'admin';

    // 1. Authorization: Only the original donor and the verified claimant can participate
    if (!isDonor && !isClaimant && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the donor and claimant can access this conversation.'
      });
    }

    // 2. Retrieve or create conversation
    const conversation = await findOrCreateGiveawayConversation(giveaway, userId, isClaimant);

    // 3. Update giveaway tracking
    if (!giveaway.contactInitiatedAt || !giveaway.conversation) {
      giveaway.contactInitiatedAt = giveaway.contactInitiatedAt || new Date();
      giveaway.conversation       = conversation._id;
      await giveaway.save();
    }

    return res.json({
      success:        true,
      message:        'Conversation ready.',
      conversationId: conversation._id
    });
  } catch (err) {
    console.error('initiateContact error:', err);
    return res.status(500).json({ success: false, message: 'Failed to open conversation.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. DELETE /api/giveaways/:id
//    Donor or admin can unpublish (cancel) an available giveaway
//    Requires authenticate
// ─────────────────────────────────────────────────────────────────────────────
const cancelGiveaway = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid giveaway ID.' });
    }

    const giveaway = await Giveaway.findById(id);
    if (!giveaway) {
      return res.status(404).json({ success: false, message: 'Giveaway not found.' });
    }

    const isDonor = giveaway.donor.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isDonor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the original donor can unpublish this giveaway.'
      });
    }

    if (giveaway.status === 'cancelled') {
      return res.status(409).json({ success: false, message: 'This giveaway is already unpublished.' });
    }

    if (['pending', 'claimed'].includes(giveaway.status) || giveaway.selectedUser) {
      return res.status(409).json({
        success: false,
        message: 'This giveaway already has an active claim and cannot be unpublished.'
      });
    }

    if (giveaway.status === 'expired' || new Date(giveaway.deadline) <= new Date()) {
      return res.status(409).json({
        success: false,
        message: 'This giveaway has already expired and cannot be unpublished.'
      });
    }

    // Atomic update preventing race conditions
    const query = {
      _id:          id,
      status:       'available',
      selectedUser: null
    };
    if (!isAdmin) {
      query.donor = req.user._id;
    }

    const updated = await Giveaway.findOneAndUpdate(
      query,
      { $set: { status: 'cancelled' } },
      { new: true }
    );

    if (!updated) {
      return res.status(409).json({
        success: false,
        message: 'Giveaway could not be unpublished due to a concurrent status change. Please refresh.'
      });
    }

    return res.json({
      success:  true,
      message:  'Giveaway unpublished successfully.',
      giveaway: updated
    });
  } catch (err) {
    console.error('cancelGiveaway error:', err);
    return res.status(500).json({ success: false, message: 'Failed to unpublish giveaway.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. GET /api/giveaways/my-giveaways — Donor's own listings
// ─────────────────────────────────────────────────────────────────────────────
const getMyGiveaways = async (req, res) => {
  try {
    const giveaways = await Giveaway.find({ donor: req.user._id })
      .populate('donor',        'fullName userId department hall avatarUrl isVerified')
      .populate('selectedUser', 'fullName userId department hall avatarUrl isVerified')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, count: giveaways.length, giveaways });
  } catch (err) {
    console.error('getMyGiveaways error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch your giveaways.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. GET /api/giveaways/my-claims — Items this user has claimed
// ─────────────────────────────────────────────────────────────────────────────
const getMyClaims = async (req, res) => {
  try {
    const userId = req.user._id;

    const giveaways = await Giveaway.find({ selectedUser: userId })
      .populate('donor',        'fullName userId department hall avatarUrl isVerified contactNumber email')
      .populate('selectedUser', 'fullName userId department hall avatarUrl isVerified')
      .sort({ updatedAt: -1 })
      .lean();

    const annotated = giveaways.map(g => ({
      ...g,
      myClaimRole: 'winner'
    }));

    return res.json({
      success:   true,
      count:     annotated.length,
      claims:    annotated,
      giveaways: annotated
    });
  } catch (err) {
    console.error('getMyClaims error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch your claims.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. POST /api/giveaways/:id/unclaim
//    Claimant unclaims item, or donor/admin returns claimed item to available
// ─────────────────────────────────────────────────────────────────────────────
const unclaimGiveaway = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid giveaway ID.' });
    }

    const giveaway = await Giveaway.findById(id)
      .populate('donor', 'fullName userId department hall avatarUrl isVerified')
      .populate('selectedUser', 'fullName userId department hall avatarUrl isVerified');

    if (!giveaway) {
      return res.status(404).json({ success: false, message: 'Giveaway not found.' });
    }

    if (!['pending', 'claimed'].includes(giveaway.status) || !giveaway.selectedUser) {
      return res.status(400).json({
        success: false,
        message: 'This giveaway is not currently in a pending or claimed state.'
      });
    }

    const donorId = (giveaway.donor?._id || giveaway.donor).toString();
    const claimantId = (giveaway.selectedUser?._id || giveaway.selectedUser).toString();
    const isDonor = userId === donorId;
    const isClaimant = userId === claimantId;
    const isAdmin = req.user.role === 'admin';

    if (!isDonor && !isClaimant && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the claimant or the donor can unclaim this giveaway.'
      });
    }

    const previousClaimant = giveaway.selectedUser;

    giveaway.status = 'available';
    giveaway.selectedUser = null;
    giveaway.claimedAt = null;
    if (giveaway.claimedCount > 0) {
      giveaway.claimedCount -= 1;
    }
    await giveaway.save();

    // Notify the other party
    try {
      if (isClaimant) {
        await Notification.create({
          recipient: donorId,
          type: 'giveaway_update',
          title: 'Giveaway Unclaimed',
          message: `${previousClaimant?.fullName || 'The claimant'} has released their claim on "${giveaway.title}". The item is available again.`,
          linkType: 'giveaway',
          linkId: giveaway._id,
          metadata: { giveawayId: giveaway._id, giveawayTitle: giveaway.title }
        });
      } else {
        await Notification.create({
          recipient: claimantId,
          type: 'giveaway_update',
          title: 'Giveaway Returned to Available',
          message: `The giveaway "${giveaway.title}" was marked as unclaimed by the owner and returned to available.`,
          linkType: 'giveaway',
          linkId: giveaway._id,
          metadata: { giveawayId: giveaway._id, giveawayTitle: giveaway.title }
        });
      }
    } catch (notifErr) {
      console.warn('Notification on unclaim failed:', notifErr.message);
    }

    return res.json({
      success: true,
      message: isClaimant ? 'You have successfully unclaimed this item.' : 'Giveaway marked as unclaimed.',
      giveaway
    });
  } catch (err) {
    console.error('unclaimGiveaway error:', err);
    return res.status(500).json({ success: false, message: 'Failed to unclaim giveaway.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 10. POST /api/giveaways/:id/mark-given-away
//     Donor or admin marks the claimed item as given away
// ─────────────────────────────────────────────────────────────────────────────
const markGivenAway = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid giveaway ID.' });
    }

    const giveaway = await Giveaway.findById(id)
      .populate('donor', 'fullName userId department hall avatarUrl isVerified')
      .populate('selectedUser', 'fullName userId department hall avatarUrl isVerified');

    if (!giveaway) {
      return res.status(404).json({ success: false, message: 'Giveaway not found.' });
    }

    const donorId = (giveaway.donor?._id || giveaway.donor).toString();
    const isDonor = userId === donorId;
    const isAdmin = req.user.role === 'admin';

    if (!isDonor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the donor can mark this giveaway as given away.'
      });
    }

    giveaway.status = 'given_away';
    await giveaway.save();

    // Increment donor totalGiveaways
    try {
      await User.findByIdAndUpdate(donorId, { $inc: { totalGiveaways: 1 } });
    } catch (uErr) {
      console.warn('Failed to increment totalGiveaways:', uErr.message);
    }

    // Notify claimant if exists
    if (giveaway.selectedUser) {
      const claimantId = (giveaway.selectedUser._id || giveaway.selectedUser).toString();
      try {
        await Notification.create({
          recipient: claimantId,
          type: 'giveaway_update',
          title: 'Giveaway Completed',
          message: `The donor marked "${giveaway.title}" as given away. Thank you!`,
          linkType: 'giveaway',
          linkId: giveaway._id,
          metadata: { giveawayId: giveaway._id, giveawayTitle: giveaway.title }
        });
      } catch (notifErr) {
        console.warn('Notification on mark given away failed:', notifErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Giveaway marked as given away successfully!',
      giveaway
    });
  } catch (err) {
    console.error('markGivenAway error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update giveaway status.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 11. POST /api/giveaways/:id/approve
//     Donor or admin approves a pending claim, transitioning it to 'claimed'
//     Requires authenticate
// ─────────────────────────────────────────────────────────────────────────────
const approveClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid giveaway ID.' });
    }

    const giveaway = await Giveaway.findById(id)
      .populate('donor', 'fullName userId department hall avatarUrl isVerified')
      .populate('selectedUser', 'fullName userId department hall avatarUrl isVerified');

    if (!giveaway) {
      return res.status(404).json({ success: false, message: 'Giveaway not found.' });
    }

    const donorId = (giveaway.donor?._id || giveaway.donor).toString();
    const isDonor = userId === donorId;
    const isAdmin = req.user.role === 'admin';

    if (!isDonor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the giveaway owner can approve this claim.'
      });
    }

    if (giveaway.status === 'claimed') {
      return res.status(400).json({
        success: false,
        message: 'This giveaway is already approved as claimed.'
      });
    }

    if (giveaway.status !== 'pending' || !giveaway.selectedUser) {
      return res.status(400).json({
        success: false,
        message: 'This giveaway does not have a pending claim to approve.'
      });
    }

    giveaway.status = 'claimed';
    await giveaway.save();

    // Notify the claimant that their claim was approved
    const claimantId = (giveaway.selectedUser._id || giveaway.selectedUser).toString();
    try {
      await Notification.create({
        recipient: claimantId,
        type:      'giveaway_update',
        title:     'Claim Approved!',
        message:   `The giveaway owner approved your claim for "${giveaway.title}". Please arrange pickup.`,
        linkType:  'giveaway',
        linkId:    giveaway._id,
        metadata: {
          giveawayId:     giveaway._id,
          giveawayTitle:  giveaway.title,
          conversationId: giveaway.conversation || null
        }
      });
    } catch (notifErr) {
      console.warn('Notification on claim approval failed:', notifErr.message);
    }

    return res.json({
      success:  true,
      message:  'Claim approved successfully! The giveaway is now marked as claimed.',
      giveaway
    });
  } catch (err) {
    console.error('approveClaim error:', err);
    return res.status(500).json({ success: false, message: 'Failed to approve claim.' });
  }
};

module.exports = {
  getGiveaways,
  getGiveawayById,
  createGiveaway,
  claimGiveaway,
  initiateContact,
  cancelGiveaway,
  getMyGiveaways,
  getMyClaims,
  unclaimGiveaway,
  markGivenAway,
  approveClaim
};
