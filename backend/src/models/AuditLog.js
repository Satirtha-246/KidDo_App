const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    adminEmail: {
      type: String,
      required: true,
    },
    adminRole: {
      type: String,
      default: 'admin',
    },
    action: {
      type: String,
      required: true,
      index: true,
    }, // e.g. 'BAN_USER', 'RESTORE_STREAK', 'ADJUST_COINS', 'CREATE_QUESTION', 'UPDATE_CONFIG', 'CREATE_BROADCAST'
    resource: {
      type: String,
      required: true,
      index: true,
    }, // 'User', 'QuizQuestion', 'SystemConfig', 'ShopItem', 'BroadcastMessage'
    resourceId: {
      type: String,
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
