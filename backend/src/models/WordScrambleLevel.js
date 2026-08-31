const mongoose = require('mongoose');

const wordItemSchema = new mongoose.Schema(
  {
    word: { type: String, required: true, uppercase: true },
    hint: { type: String, required: true },
    emoji: { type: String, required: true },
    category: { type: String, required: true },
  },
  { _id: false }
);

const wordScrambleLevelSchema = new mongoose.Schema(
  {
    levelNumber: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    puzzles: { type: [wordItemSchema], required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WordScrambleLevel', wordScrambleLevelSchema);
