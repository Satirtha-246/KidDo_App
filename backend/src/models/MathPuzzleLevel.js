const mongoose = require('mongoose');

const mathPuzzleQuestionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['symbolAlgebra', 'numberPattern', 'mathRiddle', 'logicGrid'],
    },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    visualLines: { type: [String], default: [] },
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String, default: '' },
    hint: { type: String, default: '' },
  },
  { _id: false }
);

const mathPuzzleLevelSchema = new mongoose.Schema(
  {
    levelNumber: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    puzzles: { type: [mathPuzzleQuestionSchema], required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MathPuzzleLevel', mathPuzzleLevelSchema);
