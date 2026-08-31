const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema(
  {
    gameKey: {
      type: String,
      required: true,
      unique: true,
      enum: ['math_puzzle', 'word_scramble', 'memory_match'],
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    emoji: { type: String, required: true },
    category: { type: String, default: '10 Levels' },
    color: { type: String, default: '#38bdf8' },
    gradientColors: { type: [String], default: ['#6C63FF', '#9B59B6'] },
    totalLevels: { type: Number, default: 10 },
    order: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Game', gameSchema);
