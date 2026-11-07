const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    action: {
      type: String,
      required: true,
      enum: [
        'USER_WARNED',
        'USER_SUSPENDED',
        'USER_BANNED',
        'USER_RESTORED',
        'USER_EDITED',
        'SHOP_SUSPENDED',
        'SHOP_DISABLED',
        'SHOP_HIDDEN',
        'SHOP_RESTORED',
        'SHOP_EDITED',
        'PRODUCT_HIDDEN',
        'PRODUCT_REMOVED',
        'PRODUCT_RESTORED',
        'PRODUCT_EDITED',
        'REPORT_STATUS_UPDATED',
        'REPORT_RESOLVED',
        'REPORT_DISMISSED',
        'SYSTEM_SETTINGS_UPDATED',
        'ADMIN_PASSWORD_CHANGED'
      ]
    },
    targetType: {
      type: String,
      required: true,
      enum: ['user', 'shop', 'product', 'report', 'system']
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    targetName: {
      type: String,
      default: ''
    },
    reason: {
      type: String,
      default: ''
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

adminLogSchema.index({ createdAt: -1 });
adminLogSchema.index({ admin: 1, createdAt: -1 });
adminLogSchema.index({ action: 1 });
adminLogSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('AdminLog', adminLogSchema);

