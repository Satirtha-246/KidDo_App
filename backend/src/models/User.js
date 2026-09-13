const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const completedQuizSchema = new mongoose.Schema(
  {
    subject: String,
    unitNumber: Number,
    quizName: String,
    stars: { type: Number, min: 0, max: 3, default: 1 },
    iqEarned: { type: Number, default: 0 },
    coinsEarned: { type: Number, default: 0 },
    completedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    passwordHash: { type: String, required: false, select: false },
    googleId: { type: String, default: null },
    avatarUrl: { type: String, default: 'assets/images/kido_character.png' },
    age: { type: Number, default: 8, min: 3, max: 20 },
    gradeClass: { type: String, default: 'Class 3' },
    hasCompletedOnboarding: { type: Boolean, default: false },

    // ── RBAC & Account Controls ──────────────────────────────────────────────
    role: {
      type: String,
      enum: ['student', 'content_creator', 'admin'],
      default: 'student',
      index: true,
    },
    isBanned: { type: Boolean, default: false },
    forceLogoutBefore: { type: Date, default: null },
    deviceType: { type: String, default: 'iOS/Android' },
    appVersion: { type: String, default: '1.0.0' },
    lastLoginAt: { type: Date, default: Date.now },

    // ── Gamification ────────────────────────────────────────────────────────
    iq: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActiveDate: { type: Date, default: null },
    totalQuizzesCompleted: { type: Number, default: 0 },
    totalGamesPlayed: { type: Number, default: 0 },
    completedUnits: { type: [String], default: [] }, // Array of completed unit keys e.g. "Math_1", "GK_2"

    // ── Lesson Progress (per subject) ────────────────────────────────────────
    // Tracks which unit the user is currently on for each subject (1-based)
    currentUnitBySubject: {
      Math: { type: Number, default: 1 },
      GK: { type: Number, default: 1 },
      English: { type: Number, default: 1 },
      Computer: { type: Number, default: 1 },
    },

    // Detailed list of every quiz completed (for star tracking per quiz)
    completedQuizzes: { type: [completedQuizSchema], default: [] },

    // ── Shop & Inventory ───────────────────────────────────────────────────
    ownedItemIds: { type: [String], default: [] },
    activeTheme: { type: String, default: 'default' },
    activeAvatar: { type: String, default: '' },
    streakFreezes: { type: Number, default: 1 },
    hasFeedSubscription: { type: Boolean, default: false },

    // ── Habit & Parent Spectator Metrics ────────────────────────────────────
    learningMinutesToday: { type: Number, default: 0 },
    weeklyActivityMinutes: { type: [Number], default: [15, 20, 10, 25, 30, 0, 15] },
    parentPin: { type: String, default: '1234' },
  },
  { timestamps: true }
);

// ── Hide passwordHash in JSON responses ──────────────────────────────────────
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

// ── Virtual: has the user completed a specific quiz? ─────────────────────────
userSchema.methods.hasCompletedQuiz = function (subject, unitNumber, quizName) {
  return this.completedQuizzes.some(
    (q) =>
      q.subject === subject &&
      q.unitNumber === unitNumber &&
      q.quizName === quizName
  );
};

userSchema.methods.getQuizStars = function (subject, unitNumber, quizName) {
  const q = this.completedQuizzes.find(
    (q) =>
      q.subject === subject &&
      q.unitNumber === unitNumber &&
      q.quizName === quizName
  );
  return q ? q.stars : 0;
};

// ── Password comparison ──────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
