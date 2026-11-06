/**
 * giveawayScheduler.js
 *
 * Background job runner using node-cron.
 * Handles three periodic tasks:
 *   A. Resolve pending draws whose 30-second buffer has expired.
 *   B. Cascade claimed giveaways whose contact deadline has passed without contact.
 *   C. Expire available giveaways whose overall deadline has passed.
 *
 * Safety guarantees:
 *   - Every MongoDB update is atomic and conditional, so multiple Node.js
 *     instances running this scheduler produce idempotent results.
 *   - Each job is wrapped in a try/catch; failures are logged but never crash
 *     the server.
 *   - Lock flags (`isRunning*`) prevent overlapping runs WITHIN a single
 *     instance. Cross-instance safety is provided by the atomic DB operations.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * To migrate to BullMQ + Redis (production recommendation):
 *
 *   1. npm install bullmq ioredis
 *   2. Create a Queue: const queue = new Queue('giveaways', { connection })
 *   3. Add jobs with delay/repeat:
 *        queue.add('resolveDraw',  {}, { repeat: { every: 5000  } })
 *        queue.add('cascadeWinner',{}, { repeat: { every: 10000 } })
 *        queue.add('expireItems',  {}, { repeat: { every: 60000 } })
 *   4. Create Workers that call resolveGiveaway / cascadeGiveaway / expireGiveaways.
 *   5. BullMQ persists jobs across restarts in Redis; retries are built-in.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const cron    = require('node-cron');
const Giveaway = require('../models/Giveaway');
const { resolveGiveaway, cascadeGiveaway } = require('../controllers/giveawayController');

let isRunningResolve = false;
let isRunningCascade = false;
let isRunningExpire  = false;

// ── Job A: Resolve pending draws (every 10 seconds) ───────────────────────────
async function runPendingDrawResolution() {
  if (isRunningResolve) return;
  isRunningResolve = true;
  try {
    const now = new Date();
    const pendingGiveaways = await Giveaway.find({
      status:            'pending_draw',
      claimBufferEndsAt: { $lte: now }
    }).select('_id').lean();

    if (pendingGiveaways.length > 0) {
      console.log(`[Scheduler-A] Found ${pendingGiveaways.length} giveaway(s) to resolve.`);
    }

    for (const doc of pendingGiveaways) {
      try {
        await resolveGiveaway(doc._id);
      } catch (err) {
        console.error(`[Scheduler-A] Failed to resolve giveaway ${doc._id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[Scheduler-A] Pending draw resolution failed:', err.message);
  } finally {
    isRunningResolve = false;
  }
}

// ── Job B: Cascade expired winners (every 30 seconds) ─────────────────────────
async function runWinnerCascade() {
  if (isRunningCascade) return;
  isRunningCascade = true;
  try {
    const now = new Date();
    const expiredWinners = await Giveaway.find({
      status:             'claimed',
      pickupDeadline:     { $lte: now },
      contactInitiatedAt: null
    }).select('_id').lean();

    if (expiredWinners.length > 0) {
      console.log(`[Scheduler-B] Found ${expiredWinners.length} giveaway(s) with expired winners.`);
    }

    for (const doc of expiredWinners) {
      try {
        await cascadeGiveaway(doc._id);
      } catch (err) {
        console.error(`[Scheduler-B] Failed to cascade giveaway ${doc._id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[Scheduler-B] Winner cascade failed:', err.message);
  } finally {
    isRunningCascade = false;
  }
}

// ── Job C: Expire available giveaways past their deadline (every minute) ──────
async function runDeadlineExpiry() {
  if (isRunningExpire) return;
  isRunningExpire = true;
  try {
    const now = new Date();
    const result = await Giveaway.updateMany(
      {
        status:   'available',
        deadline: { $lte: now }
      },
      { $set: { status: 'expired' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`[Scheduler-C] Expired ${result.modifiedCount} giveaway(s).`);
    }
  } catch (err) {
    console.error('[Scheduler-C] Deadline expiry failed:', err.message);
  } finally {
    isRunningExpire = false;
  }
}

// ── Start all scheduled tasks ─────────────────────────────────────────────────
function startGiveawayScheduler() {
  // Job A — every 10 seconds
  cron.schedule('*/10 * * * * *', runPendingDrawResolution, {
    scheduled: true,
    timezone:  'Asia/Dhaka'
  });

  // Job B — every 30 seconds
  cron.schedule('*/30 * * * * *', runWinnerCascade, {
    scheduled: true,
    timezone:  'Asia/Dhaka'
  });

  // Job C — every minute
  cron.schedule('* * * * *', runDeadlineExpiry, {
    scheduled: true,
    timezone:  'Asia/Dhaka'
  });

  console.log('✅ Giveaway scheduler started (draw resolution: 10s, cascade: 30s, expiry: 1m)');
}

module.exports = { startGiveawayScheduler };

