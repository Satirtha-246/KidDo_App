const Game = require('../models/Game');
const MathPuzzleLevel = require('../models/MathPuzzleLevel');
const WordScrambleLevel = require('../models/WordScrambleLevel');
const MemoryMatchLevel = require('../models/MemoryMatchLevel');
const GameProgress = require('../models/GameProgress');
const GameAttempt = require('../models/GameAttempt');
const User = require('../models/User');

const STAR_REWARDS = {
  1: { iq: 10, coins: 5 },
  2: { iq: 20, coins: 10 },
  3: { iq: 30, coins: 15 },
};

// ── GET /api/games ─────────────────────────────────────────────────────────────
exports.getGames = async (req, res, next) => {
  try {
    const games = await Game.find({ isActive: true }).sort({ order: 1 }).lean();
    const userId = req.user?._id;

    const gamesWithProgress = await Promise.all(
      games.map(async (game) => {
        let earnedStars = 0;
        let unlockedLevels = 1;

        if (userId) {
          const progressList = await GameProgress.find({
            userId,
            gameKey: game.gameKey,
          });

          earnedStars = progressList.reduce((acc, p) => acc + (p.stars || 0), 0);
          const maxUnlocked = progressList
            .filter((p) => p.isUnlocked || p.stars > 0)
            .reduce((max, p) => Math.max(max, p.levelNumber), 1);
          unlockedLevels = Math.min(maxUnlocked + 1, game.totalLevels);
        }

        return {
          ...game,
          earnedStars,
          unlockedLevels,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: gamesWithProgress.length,
      games: gamesWithProgress,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/games/:gameKey/levels ────────────────────────────────────────────
exports.getGameLevels = async (req, res, next) => {
  try {
    const { gameKey } = req.params;
    const userId = req.user?._id;

    let levels = [];
    if (gameKey === 'math_puzzle') {
      levels = await MathPuzzleLevel.find()
        .select('levelNumber title description icon')
        .sort({ levelNumber: 1 })
        .lean();
    } else if (gameKey === 'word_scramble') {
      levels = await WordScrambleLevel.find()
        .select('levelNumber title description icon')
        .sort({ levelNumber: 1 })
        .lean();
    } else if (gameKey === 'memory_match') {
      levels = await MemoryMatchLevel.find()
        .select('levelNumber title description icon')
        .sort({ levelNumber: 1 })
        .lean();
    } else {
      return res.status(404).json({ success: false, message: `Unknown gameKey: ${gameKey}` });
    }

    // Attach user progress
    let userProgressMap = {};
    if (userId) {
      const progressDocs = await GameProgress.find({ userId, gameKey });
      progressDocs.forEach((p) => {
        userProgressMap[p.levelNumber] = p;
      });
    }

    let highestUnlocked = 1;
    for (let i = 1; i <= 50; i++) {
      if (userProgressMap[i] && userProgressMap[i].stars > 0) {
        highestUnlocked = i + 1;
      } else {
        break;
      }
    }

    const levelsWithProgress = levels.map((lvl) => {
      const p = userProgressMap[lvl.levelNumber];
      const isUnlocked = lvl.levelNumber <= highestUnlocked || p?.isUnlocked === true;
      return {
        ...lvl,
        stars: p?.stars || 0,
        bestScore: p?.bestScore || 0,
        isCompleted: (p?.stars || 0) > 0,
        isUnlocked,
      };
    });

    res.status(200).json({
      success: true,
      gameKey,
      levels: levelsWithProgress,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/games/:gameKey/levels/:levelNumber ────────────────────────────────
exports.getLevelData = async (req, res, next) => {
  try {
    const { gameKey, levelNumber } = req.params;
    const levelNum = parseInt(levelNumber, 10);

    let levelData = null;
    if (gameKey === 'math_puzzle') {
      levelData = await MathPuzzleLevel.findOne({ levelNumber: levelNum });
    } else if (gameKey === 'word_scramble') {
      levelData = await WordScrambleLevel.findOne({ levelNumber: levelNum });
    } else if (gameKey === 'memory_match') {
      levelData = await MemoryMatchLevel.findOne({ levelNumber: levelNum });
    } else {
      return res.status(404).json({ success: false, message: `Unknown gameKey: ${gameKey}` });
    }

    if (!levelData) {
      return res.status(404).json({
        success: false,
        message: `Level ${levelNumber} for ${gameKey} not found in database`,
      });
    }

    res.status(200).json({
      success: true,
      gameKey,
      level: levelData,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/games/submit ─────────────────────────────────────────────────────
exports.submitGameLevel = async (req, res, next) => {
  try {
    const { gameKey, levelNumber, stars, score = 0, moves = null, timeSeconds = null } = req.body;
    const userId = req.user._id;

    const levelNum = parseInt(levelNumber, 10);
    const starCount = Math.max(1, Math.min(3, parseInt(stars, 10) || 1));

    // Find previous progress
    let progress = await GameProgress.findOne({ userId, gameKey, levelNumber: levelNum });
    const prevStars = progress?.stars || 0;

    let iqEarned = 0;
    let coinsEarned = 0;

    if (!progress || prevStars === 0) {
      // First time completion
      const reward = STAR_REWARDS[starCount] || STAR_REWARDS[1];
      iqEarned = reward.iq;
      coinsEarned = reward.coins;
    } else if (starCount > prevStars) {
      // Star improvement: award difference
      const prevReward = STAR_REWARDS[prevStars] || { iq: 0, coins: 0 };
      const newReward = STAR_REWARDS[starCount];
      iqEarned = Math.max(0, newReward.iq - prevReward.iq);
      coinsEarned = Math.max(0, newReward.coins - prevReward.coins);
    } else {
      // Replay practice reward
      iqEarned = 2;
      coinsEarned = 1;
    }

    // Upsert level progress
    if (!progress) {
      progress = new GameProgress({
        userId,
        gameKey,
        levelNumber: levelNum,
        stars: starCount,
        bestScore: score,
        bestMoves: moves,
        bestTimeSeconds: timeSeconds,
        isCompleted: true,
        isUnlocked: true,
        completedAt: new Date(),
      });
    } else {
      if (starCount > progress.stars) progress.stars = starCount;
      if (score > progress.bestScore) progress.bestScore = score;
      if (moves !== null && (progress.bestMoves === null || moves < progress.bestMoves)) {
        progress.bestMoves = moves;
      }
      if (timeSeconds !== null && (progress.bestTimeSeconds === null || timeSeconds < progress.bestTimeSeconds)) {
        progress.bestTimeSeconds = timeSeconds;
      }
      progress.isCompleted = true;
      progress.completedAt = new Date();
    }
    await progress.save();

    // Unlock next level (levelNumber + 1)
    const nextLevelNum = levelNum + 1;
    let nextProgress = await GameProgress.findOne({ userId, gameKey, levelNumber: nextLevelNum });
    if (!nextProgress) {
      nextProgress = await GameProgress.create({
        userId,
        gameKey,
        levelNumber: nextLevelNum,
        isUnlocked: true,
        stars: 0,
      });
    } else if (!nextProgress.isUnlocked) {
      nextProgress.isUnlocked = true;
      await nextProgress.save();
    }

    // Log attempt history
    await GameAttempt.create({
      userId,
      gameKey,
      levelNumber: levelNum,
      stars: starCount,
      score,
      moves,
      timeSeconds,
      iqEarned,
      coinsEarned,
    });

    // Update user stats
    const user = await User.findById(userId);
    user.iq += iqEarned;
    user.coins += coinsEarned;
    user.totalGamesPlayed += 1;

    // Daily streak check
    const now = new Date();
    if (user.lastActiveDate) {
      const lastActive = new Date(user.lastActiveDate);
      const diffHours = (now - lastActive) / (1000 * 60 * 60);
      if (diffHours >= 20 && diffHours < 48) {
        user.streak += 1;
        if (user.streak > user.longestStreak) user.longestStreak = user.streak;
      } else if (diffHours >= 48) {
        user.streak = 1;
      }
    } else {
      user.streak = 1;
    }
    user.lastActiveDate = now;

    await user.save();

    res.status(200).json({
      success: true,
      gameKey,
      levelNumber: levelNum,
      stars: starCount,
      iqEarned,
      coinsEarned,
      nextLevelUnlocked: nextLevelNum,
      user: {
        iq: user.iq,
        coins: user.coins,
        streak: user.streak,
      },
    });
  } catch (err) {
    next(err);
  }
};
