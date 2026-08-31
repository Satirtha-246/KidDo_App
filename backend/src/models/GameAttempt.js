const mongoose = require('mongoose');

const gameAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    gameKey: {
      type: String,
      required: true,
      enum: ['math_puzzle', 'word_scramble', 'memory_match'],
      index: true,
    },
    levelNumber: { type: Number, required: true },
    stars: { type: Number, min: 0, max: 3, required: true },
    score: { type: Number, default: 0 },
    moves: { type: Number, default: null },
    timeSeconds: { type: Number, default: null },
    iqEarned: { type: Number, default: 0 },
    coinsEarned: { type: Number, default: 0 },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

gameAttemptSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('GameAttempt', gameAttemptSchema);
