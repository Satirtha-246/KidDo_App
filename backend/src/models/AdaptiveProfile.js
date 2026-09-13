const mongoose = require('mongoose');

const adaptiveProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    consecutiveFastCorrect: {
      type: Number,
      default: 0, // 3 in <10s triggers difficulty ramp up
    },
    consecutiveIncorrect: {
      type: Number,
      default: 0, // 2 triggers quiet fallback to foundational
    },
    currentAdaptiveDifficulty: {
      type: String,
      enum: ['beginner', 'moderate', 'hard'],
      default: 'beginner',
    },
    mistakeHistory: [
      {
        subject: String,
        topic: String,
        questionType: String,
        wrongCount: { type: Number, default: 1 },
        lastMistakeAt: { type: Date, default: Date.now },
      },
    ],
    strongTopics: [String],
    weakTopics: [String],
    totalQuestionsAnswered: { type: Number, default: 0 },
    totalCorrectAnswered: { type: Number, default: 0 },
    avgResponseTimeSeconds: { type: Number, default: 8.0 },
    lastMascotSuggestion: {
      title: { type: String, default: "Let's learn something new!" },
      message: { type: String, default: "Keep up your great streak today! You are mastering your lessons." },
      suggestedSubject: { type: String, default: 'Math' },
      suggestedUnit: { type: Number, default: 1 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdaptiveProfile', adaptiveProfileSchema);
