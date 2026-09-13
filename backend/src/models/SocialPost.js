const mongoose = require('mongoose');

const socialPostSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    avatarUrl: {
      type: String,
      default: 'assets/images/kido_character.png',
    },
    gradeClass: {
      type: String,
      default: 'Class 3',
    },
    activityType: {
      type: String,
      enum: ['boss_defeated', 'streak_milestone', 'level_up', 'quiz_mastery', 'challenge_cleared', 'coop_victory'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
      default: '',
    },
    badgeEmoji: {
      type: String,
      default: '🏆',
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('SocialPost', socialPostSchema);
