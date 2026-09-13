const mongoose = require('mongoose');

const coopQuestSchema = new mongoose.Schema(
  {
    gradeClass: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      default: 'Math',
    },
    targetCount: {
      type: Number,
      default: 500,
    },
    currentCount: {
      type: Number,
      default: 0,
    },
    rewardBadge: {
      type: String,
      default: '🌟 Math Legend',
    },
    rewardCoins: {
      type: Number,
      default: 100,
    },
    rewardIq: {
      type: Number,
      default: 200,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    contributors: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String,
        count: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('CoopQuest', coopQuestSchema);
