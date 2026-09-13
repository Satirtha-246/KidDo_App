const mongoose = require('mongoose');

const dailyChallengeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    dateKey: {
      type: String, // e.g. "2026-09-13"
      required: true,
      index: true,
    },
    taskId: {
      type: String,
      required: true,
    },
    taskTitle: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['quiz', 'game', 'chapter', 'streak', 'boss_fight'],
      default: 'quiz',
    },
    subject: {
      type: String,
      default: 'General',
    },
    targetCount: {
      type: Number,
      default: 3,
    },
    currentCount: {
      type: Number,
      default: 0,
    },
    weight: {
      type: Number,
      default: 1.0, // Effort multiplier
    },
    iqReward: {
      type: Number,
      default: 20,
    },
    coinReward: {
      type: Number,
      default: 10,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    isClaimed: {
      type: Boolean,
      default: false,
    },
    mascotEmoji: {
      type: String,
      default: '🐘',
    },
  },
  { timestamps: true }
);

dailyChallengeSchema.index({ userId: 1, dateKey: 1 });

module.exports = mongoose.model('DailyChallenge', dailyChallengeSchema);
