/**
 * giveawayController.js
 *
 * Full controller for the Giveaways feature.
 * Integrates with the existing:
 *   - User model (isVerified, isBanned, role, fullName, department)
 *   - Conversation / Message model (messages.js route: POST /api/messages/start)
 *   - Cloudinary config (server/config/cloudinary.js)
 *   - authenticate middleware (server/middleware/auth.js)
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const Giveaway = require('../models/Giveaway');
const { Conversation } = require('../models/Message');
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

// 30 seconds claim buffer window (ms)
const CLAIM_BUFFER_MS = 30 * 1000;

// 6 hour contact deadline (ms)
const CONTACT_DEADLINE_MS = 6 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — Cryptographically secure random integer in [0, max)
// ─────────────────────────────────────────────────────────────────────────────
function secureRandomInt(max) {
  if (max <= 0) throw new Error('max must be a positive integer');
  return crypto.randomInt(0, max);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/giveaways
//    Public — no auth required for browsing
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
      deadline: { $gt: new Date() },   // only non-expired by deadline
      status: { $nin: ['expired', 'cancelled'] }
    };

    if (hideClaimed === 'true') {
      filter.status = { $in: ['available', 'pending_draw'] };
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

    const giveaways = await Giveaway.find(filter)
      .populate('donor', 'fullName userId department hall avatarUrl isVerified')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    return res.json({
      success: true,
      count: giveaways.length,
      giveaways
    });
  } catch (err) {
    console.error('getGiveaways error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch giveaways.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /api/giveaways/:id
//    Public — full detail. Sensitive applicant info hidden from non-participants.
// ─────────────────────────────────────────────────────────────────────────────
const getGiveawayById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid giveaway ID.' });
    }

    const giveaway = await Giveaway.findById(id)
      .populate('donor',        'fullName userId department hall avatarUrl isVerified')
      .populate('selectedUser', 'fullName userId department avatarUrl')
      .lean();

    if (!giveaway) {
      return res.status(404).json({ success: false, message: 'Giveaway not found.' });
    }

    // Strip private applicant list unless the requester is donor or admin
    // (Auth is optional on this endpoint; req.user may not exist)
    const requesterId = req.user?._id?.toString();
    const donorId     = giveaway.donor?._id?.toString() || giveaway.donor?.toString();
    const isAdminOrDonor = requesterId && (
      requesterId === donorId || req.user?.role === 'admin'
    );

    if (!isAdminOrDonor) {
      delete giveaway.claimBufferApplicants;
      delete giveaway.waitlist;
    }

    return res.json({ success: true, giveaway });
  } catch (err) {
    console.error('getGiveawayById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch giveaway.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /api/giveaways
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

    // ── Validation ──────────────────────────────────────────────────────────
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

    // ── Handle images (optional — reuse Cloudinary upload from route) ───────
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((f) => f.path || f.secure_url || f.url || '').filter(Boolean);
    }

    const giveaway = await Giveaway.create({
      title:      title.trim(),
      description: description.trim(),
      category,
      condition,
      location,
      pickupSpot: pickupSpot.trim(),
      deadline,
      images,
      donor:  req.user._id,
      status: 'available'
    });

    const populated = await Giveaway.findById(giveaway._id)
      .populate('donor', 'fullName userId department hall avatarUrl isVerified');

    return res.status(201).json({
      success: true,
      message: 'Giveaway published successfully!',
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

// ─────────────────────────────────────────────────────────────────────────────
// 4. POST /api/giveaways/:id/claim
//    Requires authenticate + requireGiveawayEligibility
//
//    Atomic FCFS with 30-second concurrency window.
// ─────────────────────────────────────────────────────────────────────────────
const claimGiveaway = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid giveaway ID.' });
    }

    // Read the current document first (we need the buffer end time)
    const giveaway = await Giveaway.findById(id);
    if (!giveaway) {
      return res.status(404).json({ success: false, message: 'Giveaway not found.' });
    }

    // ── Status checks ────────────────────────────────────────────────────────
    if (['expired', 'cancelled'].includes(giveaway.status)) {
      return res.status(409).json({
        success: false,
        message: `This giveaway is ${giveaway.status} and no longer accepts claims.`
      });
    }
    if (giveaway.status === 'claimed') {
      return res.status(409).json({ success: false, message: 'This item has already been claimed.' });
    }

    // ── Deadline check ───────────────────────────────────────────────────────
    if (giveaway.deadline < new Date()) {
      return res.status(409).json({ success: false, message: 'The giveaway deadline has passed.' });
    }

    // ── Donor check ──────────────────────────────────────────────────────────
    if (giveaway.donor.toString() === userId.toString()) {
      return res.status(403).json({ success: false, message: "You cannot claim your own giveaway." });
    }

    // ── Already selected winner check ────────────────────────────────────────
    if (giveaway.selectedUser && giveaway.selectedUser.toString() === userId.toString()) {
      return res.status(409).json({ success: false, message: 'You are already the selected winner.' });
    }

    // ── Already in waitlist check ────────────────────────────────────────────
    const inWaitlist = giveaway.waitlist.some(w => w.user.toString() === userId.toString());
    if (inWaitlist) {
      return res.status(409).json({ success: false, message: 'You are already on the waitlist for this item.' });
    }

    // ── Case A: status is 'available' — first claimant, open the buffer ──────
    if (giveaway.status === 'available') {
      const bufferEndsAt = new Date(Date.now() + CLAIM_BUFFER_MS);

      // Atomic update: only succeeds if status is still 'available'
      const updated = await Giveaway.findOneAndUpdate(
        {
          _id: id,
          status: 'available',
          'claimBufferApplicants.user': { $ne: userId }
        },
        {
          $set:  { status: 'pending_draw', claimBufferEndsAt: bufferEndsAt },
          $push: {
            claimBufferApplicants: {
              user:      userId,
              claimedAt: new Date()
            }
          }
        },
        { new: true }
      );

      if (!updated) {
        // Another request beat us — re-read and attempt to join the buffer below
        const recheckDoc = await Giveaway.findById(id);
        if (!recheckDoc) {
          return res.status(404).json({ success: false, message: 'Giveaway not found.' });
        }
        if (recheckDoc.status !== 'pending_draw') {
          return res.status(409).json({ success: false, message: 'This item is no longer available.' });
        }
        // Fall through to pending_draw handler
        return joinClaimBuffer(recheckDoc, userId, res);
      }

      return res.json({
        success: true,
        message: 'Claim submitted! A 30-second draw window has started.',
        claimBufferEndsAt: updated.claimBufferEndsAt,
        status: updated.status
      });
    }

    // ── Case B: status is 'pending_draw' — join the existing buffer ──────────
    if (giveaway.status === 'pending_draw') {
      return joinClaimBuffer(giveaway, userId, res);
    }

    return res.status(409).json({ success: false, message: 'This item is not available for claiming.' });
  } catch (err) {
    console.error('claimGiveaway error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit claim.' });
  }
};

// Helper: add a user to an open claim buffer (pending_draw)
async function joinClaimBuffer(giveaway, userId, res) {
  const now = new Date();

  // Check buffer hasn't closed
  if (giveaway.claimBufferEndsAt <= now) {
    return res.status(409).json({
      success: false,
      message: 'The 30-second claim window has closed. Please wait for the draw result.'
    });
  }

  // Check not already in buffer
  const alreadyIn = giveaway.claimBufferApplicants.some(
    a => a.user.toString() === userId.toString()
  );
  if (alreadyIn) {
    return res.status(409).json({
      success: false,
      message: 'You have already submitted a claim for this giveaway.'
    });
  }

  // Atomic push — only if still pending_draw and buffer still open and user not already in
  const updated = await Giveaway.findOneAndUpdate(
    {
      _id: giveaway._id,
      status: 'pending_draw',
      claimBufferEndsAt: { $gt: now },
      'claimBufferApplicants.user': { $ne: userId }
    },
    {
      $push: {
        claimBufferApplicants: {
          user:      userId,
          claimedAt: new Date()
        }
      }
    },
    { new: true }
  );

  if (!updated) {
    return res.status(409).json({
      success: false,
      message: 'Could not join the claim window. It may have already closed or you already submitted a claim.'
    });
  }

  return res.json({
    success: true,
    message: 'You have joined the claim window! The draw result will be announced soon.',
    claimBufferEndsAt: updated.claimBufferEndsAt,
    status: updated.status
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. resolveGiveaway(giveawayId)
//    Called by the scheduler when claimBufferEndsAt has passed.
//    Atomic conditional update prevents double-resolution.
// ─────────────────────────────────────────────────────────────────────────────
const resolveGiveaway = async (giveawayId) => {
  const now = new Date();

  // Atomically acquire this giveaway for resolution by transitioning it out of
  // pending_draw while the buffer has expired. Only one worker can win this race.
  const giveaway = await Giveaway.findOneAndUpdate(
    {
      _id:               giveawayId,
      status:            'pending_draw',
      claimBufferEndsAt: { $lte: now }
    },
    {
      // Temporary marker so no other worker tries this doc simultaneously.
      // We will overwrite status in the next update.
      $set: { status: 'claimed' }
    },
    { new: false } // return the BEFORE state so we can read the applicants
  );

  if (!giveaway) {
    // Another worker already resolved this — idempotent, do nothing
    return null;
  }

  const applicants = giveaway.claimBufferApplicants;

  if (!applicants || applicants.length === 0) {
    // No one claimed — return to available (if deadline not passed) or expire
    const newStatus = giveaway.deadline > now ? 'available' : 'expired';
    await Giveaway.findByIdAndUpdate(giveawayId, {
      $set: { status: newStatus, claimBufferEndsAt: null }
    });
    return { resolved: false, reason: 'no_applicants', newStatus };
  }

  // Pick winner with cryptographically secure random integer
  const winnerIndex = applicants.length === 1 ? 0 : secureRandomInt(applicants.length);
  const winner      = applicants[winnerIndex];

  // Waitlist: all other applicants in their original submission order
  const waitlist = applicants
    .filter((_, i) => i !== winnerIndex)
    .map(a => ({ user: a.user, addedAt: a.claimedAt }));

  const pickupDeadline = new Date(now.getTime() + CONTACT_DEADLINE_MS);

  await Giveaway.findByIdAndUpdate(giveawayId, {
    $set: {
      status:          'claimed',
      selectedUser:    winner.user,
      waitlist,
      pickupDeadline,
      drawResolvedAt:  now,
      claimBufferEndsAt: null
    }
  });

  console.log(
    `[GiveawayResolver] Giveaway ${giveawayId} resolved. ` +
    `Winner: ${winner.user}. Waitlist size: ${waitlist.length}.`
  );

  return {
    resolved:    true,
    giveawayId:  giveawayId.toString(),
    winnerId:    winner.user.toString(),
    waitlistLen: waitlist.length
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. POST /api/giveaways/:id/contact
//    Winner initiates contact with the donor via the existing messaging system.
//    Requires authenticate.
// ─────────────────────────────────────────────────────────────────────────────
const initiateContact = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Invalid giveaway ID.' });
    }

    const giveaway = await Giveaway.findById(id).session(session);
    if (!giveaway) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Giveaway not found.' });
    }

    // ── Authorization ────────────────────────────────────────────────────────
    if (!giveaway.selectedUser || giveaway.selectedUser.toString() !== userId.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Only the selected winner can initiate contact.'
      });
    }

    if (giveaway.status !== 'claimed') {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        success: false,
        message: 'Contact can only be initiated for claimed giveaways.'
      });
    }

    // ── Already contacted ────────────────────────────────────────────────────
    if (giveaway.contactInitiatedAt) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        success: false,
        message: 'You have already initiated contact with the donor.'
      });
    }

    // ── Deadline check ───────────────────────────────────────────────────────
    if (giveaway.pickupDeadline && giveaway.pickupDeadline < new Date()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        success: false,
        message: 'Your 6-hour contact deadline has expired.'
      });
    }

    const donorId = giveaway.donor.toString();

    // ── Find or create conversation with donor ───────────────────────────────
    // Reuse the existing Conversation model (from Message.js)
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, donorId] }
    }).session(session);

    if (!conversation) {
      const created = await Conversation.create(
        [
          {
            participants: [userId, donorId],
            lastMessage: {
              text:   `Hi! I'm the giveaway winner for "${giveaway.title}". I'd like to arrange pickup.`,
              sender: userId,
              sentAt: new Date()
            }
          }
        ],
        { session }
      );
      conversation = created[0];
    }

    // ── Mark contact initiated ───────────────────────────────────────────────
    await Giveaway.findByIdAndUpdate(
      id,
      { $set: { contactInitiatedAt: new Date() } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.json({
      success: true,
      message: 'Contact initiated successfully! Head to Messages to coordinate pickup.',
      conversationId: conversation._id
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('initiateContact error:', err);
    return res.status(500).json({ success: false, message: 'Failed to initiate contact.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. DELETE /api/giveaways/:id
//    Donor or admin can cancel. Cannot cancel a 'claimed' giveaway.
//    Requires authenticate.
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
        message: 'Only the donor or an administrator can cancel this giveaway.'
      });
    }

    if (giveaway.status === 'claimed' && !isAdmin) {
      return res.status(409).json({
        success: false,
        message: 'This giveaway has already been claimed. Contact support to cancel.'
      });
    }

    if (giveaway.status === 'cancelled') {
      return res.status(409).json({ success: false, message: 'This giveaway is already cancelled.' });
    }

    await Giveaway.findByIdAndUpdate(id, { $set: { status: 'cancelled' } });

    return res.json({ success: true, message: 'Giveaway cancelled successfully.' });
  } catch (err) {
    console.error('cancelGiveaway error:', err);
    return res.status(500).json({ success: false, message: 'Failed to cancel giveaway.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. cascadeGiveaway(giveawayId)
//    Called by the scheduler when pickupDeadline has passed without contact.
//    Promotes the next waitlist entry or returns item to available/expired.
// ─────────────────────────────────────────────────────────────────────────────
const cascadeGiveaway = async (giveawayId) => {
  const now = new Date();

  // Atomic acquisition: only act if still claimed, deadline passed, no contact
  const giveaway = await Giveaway.findOneAndUpdate(
    {
      _id:              giveawayId,
      status:           'claimed',
      pickupDeadline:   { $lte: now },
      contactInitiatedAt: null
    },
    {
      // Temporarily mark as available to prevent double processing
      $set: { status: 'available' }
    },
    { new: false }
  );

  if (!giveaway) {
    // Already handled by another worker or contact was initiated — idempotent
    return null;
  }

  // Remove expired winner from waitlist head (if they somehow got there)
  const waitlist = (giveaway.waitlist || []).filter(
    w => w.user.toString() !== (giveaway.selectedUser || '').toString()
  );

  if (waitlist.length === 0) {
    // No one left — available or expired based on deadline
    const newStatus = giveaway.deadline > now ? 'available' : 'expired';
    await Giveaway.findByIdAndUpdate(giveawayId, {
      $set: {
        status:       newStatus,
        selectedUser: null,
        pickupDeadline: null
      }
    });
    console.log(`[GiveawayCascade] ${giveawayId} waitlist empty → ${newStatus}`);
    return { promoted: false, newStatus };
  }

  // Promote next waitlist member
  const next          = waitlist[0];
  const remainingList = waitlist.slice(1);
  const newDeadline   = new Date(now.getTime() + CONTACT_DEADLINE_MS);

  await Giveaway.findByIdAndUpdate(giveawayId, {
    $set: {
      status:          'claimed',
      selectedUser:    next.user,
      waitlist:        remainingList,
      pickupDeadline:  newDeadline,
      contactInitiatedAt: null
    }
  });

  console.log(
    `[GiveawayCascade] ${giveawayId} promoted ${next.user} from waitlist. ` +
    `Remaining waitlist: ${remainingList.length}.`
  );

  return { promoted: true, newWinnerId: next.user.toString() };
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. GET /api/giveaways/my-giveaways — donor's own listings
// ─────────────────────────────────────────────────────────────────────────────
const getMyGiveaways = async (req, res) => {
  try {
    const giveaways = await Giveaway.find({ donor: req.user._id })
      .populate('selectedUser', 'fullName userId department avatarUrl')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, count: giveaways.length, giveaways });
  } catch (err) {
    console.error('getMyGiveaways error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch your giveaways.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 10. GET /api/giveaways/my-claims — items this user has claimed/applied for
// ─────────────────────────────────────────────────────────────────────────────
const getMyClaims = async (req, res) => {
  try {
    const userId = req.user._id;

    const giveaways = await Giveaway.find({
      $or: [
        { 'claimBufferApplicants.user': userId },
        { selectedUser: userId },
        { 'waitlist.user': userId }
      ]
    })
      .populate('donor', 'fullName userId department avatarUrl')
      .sort({ createdAt: -1 })
      .lean();

    // Annotate each doc with the user's claim role (selected / waitlisted / applicant)
    const annotated = giveaways.map(g => {
      const isSelected  = g.selectedUser?.toString() === userId.toString();
      const waitlistPos = (g.waitlist || []).findIndex(w => w.user.toString() === userId.toString());
      const isApplicant = (g.claimBufferApplicants || []).some(a => a.user.toString() === userId.toString());

      // Strip other applicants' identities
      delete g.claimBufferApplicants;
      delete g.waitlist;

      return {
        ...g,
        myClaimRole:    isSelected ? 'winner' : waitlistPos >= 0 ? 'waitlisted' : isApplicant ? 'applicant' : 'unknown',
        myWaitlistPos:  waitlistPos >= 0 ? waitlistPos + 1 : null
      };
    });

    return res.json({ success: true, count: annotated.length, giveaways: annotated });
  } catch (err) {
    console.error('getMyClaims error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch your claims.' });
  }
};

module.exports = {
  getGiveaways,
  getGiveawayById,
  createGiveaway,
  claimGiveaway,
  resolveGiveaway,
  initiateContact,
  cancelGiveaway,
  cascadeGiveaway,
  getMyGiveaways,
  getMyClaims
};

