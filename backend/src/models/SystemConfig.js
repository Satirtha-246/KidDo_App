const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global_settings',
    },
    // XP & Gamification Multipliers (Section 1.3)
    doubleXpEnabled: {
      type: Boolean,
      default: false,
    },
    baseXpMultiplier: {
      type: Number,
      default: 1.0,
      min: 0.5,
      max: 10.0,
    },
    bossBattleXpMultiplier: {
      type: Number,
      default: 1.5,
      min: 1.0,
      max: 10.0,
    },
    doubleXpTitle: {
      type: String,
      default: 'Double XP Weekend',
    },

    // Automated Triggers & Reminder Rules (Section 1.3)
    streakReminderEnabled: {
      type: Boolean,
      default: true,
    },
    streakReminderHour: {
      type: Number,
      default: 20, // 8 PM local trigger rule
      min: 0,
      max: 23,
    },
    inactivityThresholdDays: {
      type: Number,
      default: 3,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
