const Notification = require('../models/Notification');

/**
 * Create a notification.
 *
 * Notifications are a side effect of the action that triggered them, so a
 * failure here must never fail that action - we log and carry on.
 *
 * @returns {Promise<Object|null>} the created notification, or null if skipped
 */
async function notify({ recipient, type, title, message, linkType = null, linkId = null }) {
  try {
    if (!recipient) return null;

    return await Notification.create({
      recipient,
      type,
      title: String(title).slice(0, 120),
      message: String(message).slice(0, 500),
      linkType,
      linkId
    });
  } catch (err) {
    console.error(`Notification (${type}) failed:`, err.message);
    return null;
  }
}

/** Skip notifying someone about their own action. */
function notifyOther({ recipient, actor, ...rest }) {
  if (!recipient || !actor) return Promise.resolve(null);
  if (String(recipient) === String(actor)) return Promise.resolve(null);
  return notify({ recipient, ...rest });
}

module.exports = { notify, notifyOther };
