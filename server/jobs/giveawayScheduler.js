/**
 * giveawayScheduler.js
 *
 * Background job runner using node-cron.
 * Periodically expires available giveaways whose overall deadline has passed.
 */

const cron     = require('node-cron');
const Giveaway = require('../models/Giveaway');

let isRunningExpire = false;

// ── Expire available giveaways past their deadline (every minute) ──────────────
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
      console.log(`[Scheduler] Expired ${result.modifiedCount} giveaway(s).`);
    }
  } catch (err) {
    console.error('[Scheduler] Deadline expiry failed:', err.message);
  } finally {
    isRunningExpire = false;
  }
}

// ── Start scheduled tasks ─────────────────────────────────────────────────────
function startGiveawayScheduler() {
  // Check for expired giveaways every minute
  cron.schedule('* * * * *', runDeadlineExpiry, {
    scheduled: true,
    timezone:  'Asia/Dhaka'
  });

  console.log('✅ Giveaway scheduler started (deadline expiry: 1m)');
}

module.exports = { startGiveawayScheduler };

