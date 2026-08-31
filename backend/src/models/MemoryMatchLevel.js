const mongoose = require('mongoose');

const memoryConfigSchema = new mongoose.Schema(
  {
    pairsCount: { type: Number, required: true },
    crossAxisCount: { type: Number, required: true },
    themeEmojis: { type: [String], required: true },
    maxMovesFor3Stars: { type: Number, required: true },
    maxMovesFor2Stars: { type: Number, required: true },
    timeLimitSeconds: { type: Number, default: null },
  },
  { _id: false }
);

const memoryMatchLevelSchema = new mongoose.Schema(
  {
    levelNumber: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    config: { type: memoryConfigSchema, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MemoryMatchLevel', memoryMatchLevelSchema);
