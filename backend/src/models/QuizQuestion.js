const mongoose = require('mongoose');

const quizOptionSchema = new mongoose.Schema(
  { text: { type: String, default: null } },
  { _id: false }
);

const quizQuestionSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      enum: ['Math', 'GK', 'English', 'Computer', 'Science'],
      index: true,
    },
    gradeClass: { type: String, default: 'Class 3', index: true },
    chapter: { type: String, default: 'Chapter 1' },
    unitNumber: { type: Number, required: true, index: true }, // 1-10
    unitName: { type: String, required: true },                // "Unit 1: Number Sense"
    quizName: { type: String, required: true },                // "Quiz 1: Count to 5"
    question: { type: String, required: true },
    type: {
      type: String,
      enum: ['MCQ', 'IMG_MCQ', 'IMAGE_TAP', 'TRUE_FALSE', 'FILL_IN_BLANK'],
      default: 'MCQ',
    },
    options: { type: [String], required: true }, // ["1", "2", "3", "4"]
    correctAnswer: { type: String, required: true }, // "2" (text of correct option)
    correctIndex: { type: Number, required: true, min: 0, max: 3 }, // computed
    imageAsset: { type: String, default: null },
    explanation: { type: String, default: null },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'beginner', 'moderate'], default: 'easy' },
  },
  { timestamps: true }
);

// Compound index for fast unit/quiz lookups
quizQuestionSchema.index({ subject: 1, unitNumber: 1, quizName: 1 });

module.exports = mongoose.model('QuizQuestion', quizQuestionSchema);
