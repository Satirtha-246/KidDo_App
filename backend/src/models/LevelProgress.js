const mongoose = require('mongoose');

const levelProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    levelId: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
      enum: ['Math', 'GK', 'Science', 'English', 'Computer'],
    },
    status: {
      type: String,
      enum: ['locked', 'current', 'completed'],
      default: 'locked',
    },
    stars: {
      type: Number,
      min: 0,
      max: 3,
      default: 0,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: each user has exactly one progress record per level
levelProgressSchema.index({ userId: 1, levelId: 1 }, { unique: true });

module.exports = mongoose.model('LevelProgress', levelProgressSchema);
