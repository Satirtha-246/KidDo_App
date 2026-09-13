const mongoose = require('mongoose');

const contestStageSchema = new mongoose.Schema(
  {
    stageNumber: { type: Number, required: true }, // 1 to 5
    title: { type: String, required: true },
    description: { type: String, default: '' },
    questionCount: { type: Number, default: 10 },
    timeLimitSeconds: { type: Number, default: 180 },
    unlockDayOffset: { type: Number, default: 0 }, // Day 1 to Day 5
  },
  { _id: false }
);

const contestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    monthYear: { type: String, required: true }, // e.g. "September 2026"
    gradeClass: { type: String, required: true },
    entryCoinCost: { type: Number, default: 20 },
    registrationOpen: { type: Boolean, default: true },
    stages: [contestStageSchema],
    participants: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String,
        avatarUrl: String,
        totalScore: { type: Number, default: 0 },
        totalTimeSeconds: { type: Number, default: 0 },
        stagesCompleted: { type: Number, default: 0 },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    prizePool: {
      type: Object,
      default: {
        first: { iq: 500, coins: 250, badge: '🥇 Arena Champion' },
        second: { iq: 300, coins: 150, badge: '🥈 Arena Master' },
        third: { iq: 200, coins: 100, badge: '🥉 Arena Elite' },
      },
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Contest', contestSchema);
