const mongoose = require('mongoose');

const gameProgressSchema = new mongoose.Schema(
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
    levelNumber: {
      type: Number,
      required: true,
    },
    stars: {
      type: Number,
      min: 0,
      max: 3,
      default: 0,
    },
    bestScore: {
      type: Number,
      default: 0,
    },
    bestMoves: {
      type: Number,
      default: null,
    },
    bestTimeSeconds: {
      type: Number,
      default: null,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    isUnlocked: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// One progress record per user per game per level
gameProgressSchema.index({ userId: 1, gameKey: 1, levelNumber: 1 }, { unique: true });

module.exports = mongoose.model('GameProgress', gameProgressSchema);
