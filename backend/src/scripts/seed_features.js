require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const SocialPost = require('../models/SocialPost');
const CoopQuest = require('../models/CoopQuest');
const Contest = require('../models/Contest');
const User = require('../models/User');

const seedFeatures = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/kiddo_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    console.log('🌱 Seeding Core Features (Feed, Quests, Contests)...');

    // Find student or admin
    let user = await User.findOne({ role: 'student' });
    if (!user) {
      user = await User.findOne({});
    }

    const userId = user ? user._id : new mongoose.Types.ObjectId();
    const userName = user ? user.name : 'Aarav';

    // 1. Seed Social Posts
    await SocialPost.deleteMany({});
    await SocialPost.insertMany([
      {
        userId,
        userName: 'Aarav Sharma',
        avatarUrl: 'assets/images/kido_character.png',
        gradeClass: 'Class 3',
        activityType: 'boss_defeated',
        title: 'Defeated the Math Boss! 👑',
        caption: 'Cleared Chapter 1: Counting Number with 3 stars! Got 150 IQ & 50 Coins!',
        badgeEmoji: '⚔️',
      },
      {
        userId,
        userName: 'Diya Patel',
        avatarUrl: 'assets/images/kido_character.png',
        gradeClass: 'Class 3',
        activityType: 'streak_milestone',
        title: '5-Day Streak Achieved! 🔥',
        caption: "Practiced every day this week without missing a single lesson!",
        badgeEmoji: '🔥',
      },
      {
        userId,
        userName: 'Rohan Gupta',
        avatarUrl: 'assets/images/kido_character.png',
        gradeClass: 'Class 3',
        activityType: 'level_up',
        title: 'Reached IQ 500! 🚀',
        caption: 'Unlocked the Golden Scholar avatar in the store!',
        badgeEmoji: '🎓',
      },
    ]);
    console.log('   ✅ Seeded 3 Social Posts');

    // 2. Seed Co-op Quests
    await CoopQuest.deleteMany({});
    const nextSunday = new Date();
    nextSunday.setDate(nextSunday.getDate() + 7);
    await CoopQuest.create({
      gradeClass: 'Class 3',
      title: 'Classroom Challenge: 500 Math Problems! 🌟',
      description: 'Team up with your Class 3 classmates to solve 500 Math problems together this week to unlock the "Math Legend" profile badge and 100 bonus Coins!',
      subject: 'Math',
      targetCount: 500,
      currentCount: 140,
      rewardBadge: '🌟 Math Legend',
      rewardCoins: 100,
      rewardIq: 200,
      expiresAt: nextSunday,
      contributors: [
        { userId, userName, count: 45 },
        { userId: new mongoose.Types.ObjectId(), userName: 'Diya', count: 50 },
        { userId: new mongoose.Types.ObjectId(), userName: 'Rohan', count: 45 },
      ],
    });
    console.log('   ✅ Seeded Co-op Quest');

    // 3. Seed Contest Arena
    await Contest.deleteMany({});
    await Contest.create({
      title: 'National Math & Logic Championship 🏆',
      monthYear: 'September 2026',
      gradeClass: 'Class 3',
      entryCoinCost: 20,
      registrationOpen: true,
      stages: [
        { stageNumber: 1, title: 'Stage 1: Speed Arithmetic', questionCount: 10, timeLimitSeconds: 180, unlockDayOffset: 0 },
        { stageNumber: 2, title: 'Stage 2: Pattern Master', questionCount: 10, timeLimitSeconds: 180, unlockDayOffset: 1 },
        { stageNumber: 3, title: 'Stage 3: GK & Nature Quiz', questionCount: 10, timeLimitSeconds: 180, unlockDayOffset: 2 },
        { stageNumber: 4, title: 'Stage 4: Logic & Riddle Battle', questionCount: 10, timeLimitSeconds: 180, unlockDayOffset: 3 },
        { stageNumber: 5, title: 'Stage 5: Grand Final Boss Stage', questionCount: 15, timeLimitSeconds: 240, unlockDayOffset: 4 },
      ],
      participants: [
        {
          userId,
          userName: 'Diya Patel',
          avatarUrl: 'assets/images/kido_character.png',
          totalScore: 90,
          totalTimeSeconds: 120,
          stagesCompleted: 1,
        },
        {
          userId: new mongoose.Types.ObjectId(),
          userName: 'Rohan Gupta',
          avatarUrl: 'assets/images/kido_character.png',
          totalScore: 80,
          totalTimeSeconds: 145,
          stagesCompleted: 1,
        },
      ],
    });
    console.log('   ✅ Seeded Monthly Contest');

  } catch (err) {
    console.error('❌ Feature seeding failed:', err);
  } finally {
    if (require.main === module) {
      await mongoose.connection.close();
      process.exit(0);
    }
  }
};

if (require.main === module) {
  seedFeatures();
}

module.exports = seedFeatures;
