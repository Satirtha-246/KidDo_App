const LevelProgress = require('../models/LevelProgress');

// Default level catalogue — mirrors the KidDO level design
const DEFAULT_LEVELS = [
  { levelId: 'level_1', subject: 'Math',     number: 1,  title: 'Number Fun' },
  { levelId: 'level_2', subject: 'Math',     number: 2,  title: 'Addition Adventure' },
  { levelId: 'level_3', subject: 'Math',     number: 3,  title: 'Subtraction Quest' },
  { levelId: 'level_4', subject: 'Science',  number: 4,  title: 'Planet Explorers' },
  { levelId: 'level_5', subject: 'Science',  number: 5,  title: 'Living World' },
  { levelId: 'level_6', subject: 'English',  number: 6,  title: 'Alphabet Heroes' },
  { levelId: 'level_7', subject: 'English',  number: 7,  title: 'Word Wizards' },
  { levelId: 'level_8', subject: 'GK',       number: 8,  title: 'World Wonders' },
  { levelId: 'level_9', subject: 'Computer', number: 9,  title: 'Keyboard Kings' },
  { levelId: 'level_10', subject: 'Computer', number: 10, title: 'Internet Legends' },
];

// ── GET /api/levels ────────────────────────────────────────────────────────────
exports.getLevels = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get all progress records for this user
    const progressRecords = await LevelProgress.find({ userId });
    const progressMap = {};
    progressRecords.forEach((p) => {
      progressMap[p.levelId] = p;
    });

    // Merge default levels with user progress
    const levels = DEFAULT_LEVELS.map((level, index) => {
      const progress = progressMap[level.levelId];
      let status = 'locked';
      let stars = 0;

      if (progress) {
        status = progress.status;
        stars = progress.stars;
      } else if (index === 0) {
        // First level always unlocked
        status = 'current';
      }

      return { ...level, status, stars };
    });

    res.status(200).json({ success: true, count: levels.length, levels });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/levels/:levelId/complete ────────────────────────────────────────
exports.completeLevel = async (req, res, next) => {
  try {
    const { levelId } = req.params;
    const { stars = 1 } = req.body;
    const userId = req.user._id;

    const clampedStars = Math.min(Math.max(parseInt(stars) || 1, 0), 3);

    // Find the level in the catalogue
    const levelIndex = DEFAULT_LEVELS.findIndex((l) => l.levelId === levelId);
    if (levelIndex === -1) {
      return res.status(404).json({ success: false, message: 'Level not found' });
    }

    // Upsert this level's progress
    await LevelProgress.findOneAndUpdate(
      { userId, levelId },
      {
        userId,
        levelId,
        subject: DEFAULT_LEVELS[levelIndex].subject,
        status: 'completed',
        stars: clampedStars,
        completedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Unlock the next level
    const nextLevel = DEFAULT_LEVELS[levelIndex + 1];
    if (nextLevel) {
      await LevelProgress.findOneAndUpdate(
        { userId, levelId: nextLevel.levelId },
        {
          $setOnInsert: {
            userId,
            levelId: nextLevel.levelId,
            subject: nextLevel.subject,
            status: 'current',
            stars: 0,
          },
        },
        { upsert: true }
      );
    }

    res.status(200).json({
      success: true,
      message: `Level ${levelId} completed with ${clampedStars} star(s)!`,
      nextLevelUnlocked: nextLevel ? nextLevel.levelId : null,
    });
  } catch (err) {
    next(err);
  }
};
