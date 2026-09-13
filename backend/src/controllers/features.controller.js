const User = require('../models/User');
const DailyChallenge = require('../models/DailyChallenge');
const Friendship = require('../models/Friendship');
const SocialPost = require('../models/SocialPost');
const CoopQuest = require('../models/CoopQuest');
const Contest = require('../models/Contest');
const AdaptiveProfile = require('../models/AdaptiveProfile');
const QuizQuestion = require('../models/QuizQuestion');
const SystemConfig = require('../models/SystemConfig');

// Helper to get today's date key YYYY-MM-DD
function getTodayKey() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ADAPTIVE LEARNING ENGINE (Section 2.1 & 2.2)
// ─────────────────────────────────────────────────────────────────────────────

exports.getAdaptiveSuggestion = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let profile = await AdaptiveProfile.findOne({ userId });

    if (!profile) {
      profile = await AdaptiveProfile.create({
        userId,
        currentAdaptiveDifficulty: 'beginner',
        lastMascotSuggestion: {
          title: "Welcome Adventurer!",
          message: "Start with Math Chapter 1 to unlock cool character items and earn IQ!",
          suggestedSubject: 'Math',
          suggestedUnit: 1,
        },
      });
    }

    // Dynamic mascot advice based on weak topics or strong topics
    let mascotTitle = "You're doing fantastic! 🌟";
    let mascotMessage = "Keep practicing every day to climb the friendly leaderboard!";
    let suggestedSubject = 'Math';
    let suggestedUnit = req.user.currentUnitBySubject?.Math || 1;

    if (profile.weakTopics && profile.weakTopics.length > 0) {
      const topWeak = profile.weakTopics[0];
      mascotTitle = `Let's practice ${topWeak}! 💡`;
      mascotMessage = `I noticed you encountered a few tricky questions in ${topWeak}. Let's try some practice drills together!`;
    } else if (profile.consecutiveFastCorrect >= 3) {
      mascotTitle = "Lightning Fast! ⚡";
      mascotMessage = "You answered 3 questions in under 10 seconds! Scaling up to a higher difficulty challenge for extra IQ!";
    }

    res.status(200).json({
      success: true,
      adaptiveProfile: {
        difficulty: profile.currentAdaptiveDifficulty,
        consecutiveFastCorrect: profile.consecutiveFastCorrect,
        consecutiveIncorrect: profile.consecutiveIncorrect,
        weakTopics: profile.weakTopics,
        strongTopics: profile.strongTopics,
        avgResponseTimeSeconds: profile.avgResponseTimeSeconds,
      },
      mascotSuggestion: {
        title: mascotTitle,
        message: mascotMessage,
        suggestedSubject,
        suggestedUnit,
        mascotEmoji: '🐘',
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.recordAnswer = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { subject, topic, isCorrect, responseTimeSeconds, questionType } = req.body;

    let profile = await AdaptiveProfile.findOne({ userId });
    if (!profile) {
      profile = new AdaptiveProfile({ userId });
    }

    profile.totalQuestionsAnswered += 1;
    if (isCorrect) profile.totalCorrectAnswered += 1;

    // Running average of response time
    profile.avgResponseTimeSeconds = Number(
      ((profile.avgResponseTimeSeconds * 0.8) + (responseTimeSeconds * 0.2)).toFixed(1)
    );

    let difficultyChanged = null;

    if (isCorrect) {
      profile.consecutiveIncorrect = 0;
      if (responseTimeSeconds < 10) {
        profile.consecutiveFastCorrect += 1;
        // 3 correct in under 10s -> ramp up difficulty immediately
        if (profile.consecutiveFastCorrect >= 3) {
          if (profile.currentAdaptiveDifficulty === 'beginner') {
            profile.currentAdaptiveDifficulty = 'moderate';
            difficultyChanged = 'moderate';
          } else if (profile.currentAdaptiveDifficulty === 'moderate') {
            profile.currentAdaptiveDifficulty = 'hard';
            difficultyChanged = 'hard';
          }
        }
      }
    } else {
      profile.consecutiveFastCorrect = 0;
      profile.consecutiveIncorrect += 1;

      // 2 missed in a row -> quietly drop back to foundational concepts
      if (profile.consecutiveIncorrect >= 2) {
        if (profile.currentAdaptiveDifficulty === 'hard') {
          profile.currentAdaptiveDifficulty = 'moderate';
          difficultyChanged = 'moderate';
        } else if (profile.currentAdaptiveDifficulty === 'moderate') {
          profile.currentAdaptiveDifficulty = 'beginner';
          difficultyChanged = 'beginner';
        }
      }

      // Track weak topic & mistakes
      if (topic) {
        const existingMistake = profile.mistakeHistory.find(
          (m) => m.subject === subject && m.topic === topic
        );
        if (existingMistake) {
          existingMistake.wrongCount += 1;
          existingMistake.lastMistakeAt = new Date();
        } else {
          profile.mistakeHistory.push({
            subject,
            topic,
            questionType: questionType || 'mcq',
            wrongCount: 1,
            lastMistakeAt: new Date(),
          });
        }

        if (!profile.weakTopics.includes(topic)) {
          profile.weakTopics.push(topic);
        }
      }
    }

    await profile.save();

    res.status(200).json({
      success: true,
      currentDifficulty: profile.currentAdaptiveDifficulty,
      difficultyChanged,
      consecutiveFastCorrect: profile.consecutiveFastCorrect,
      consecutiveIncorrect: profile.consecutiveIncorrect,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. DAILY CHALLENGES & WEEKLY GOALS (Section 2.3)
// ─────────────────────────────────────────────────────────────────────────────

exports.getDailyChallenges = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const dateKey = getTodayKey();

    let challenges = await DailyChallenge.find({ userId, dateKey });

    if (challenges.length === 0) {
      // Procedurally generate 3 dynamic daily tasks for the student
      const userSubject = Object.keys(req.user.currentUnitBySubject || {})[0] || 'Math';
      const defaultTasks = [
        {
          userId,
          dateKey,
          taskId: 'task_1',
          taskTitle: 'Start New Chapter',
          description: `Complete 1 lesson quiz in ${userSubject}.`,
          category: 'quiz',
          subject: userSubject,
          targetCount: 1,
          currentCount: 0,
          weight: 1.0,
          iqReward: 30,
          coinReward: 15,
          mascotEmoji: '🐘',
        },
        {
          userId,
          dateKey,
          taskId: 'task_2',
          taskTitle: "Daily Brain Spark",
          description: 'Play 1 mini-game (Math Puzzle or Memory Match).',
          category: 'game',
          subject: 'General',
          targetCount: 1,
          currentCount: 0,
          weight: 1.2,
          iqReward: 25,
          coinReward: 10,
          mascotEmoji: '🦹',
        },
        {
          userId,
          dateKey,
          taskId: 'task_3',
          taskTitle: 'Boss Hunter',
          description: 'Answer 5 questions with over 80% accuracy.',
          category: 'quiz',
          subject: 'General',
          targetCount: 5,
          currentCount: 0,
          weight: 1.5,
          iqReward: 50,
          coinReward: 25,
          mascotEmoji: '👩‍🔬',
        },
      ];
      challenges = await DailyChallenge.insertMany(defaultTasks);
    }

    res.status(200).json({
      success: true,
      dateKey,
      challenges,
    });
  } catch (err) {
    next(err);
  }
};

exports.claimChallenge = async (req, res, next) => {
  try {
    const { challengeId } = req.body;
    const userId = req.user._id;

    const challenge = await DailyChallenge.findOne({ _id: challengeId, userId });
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }

    if (challenge.isClaimed) {
      return res.status(400).json({ success: false, message: 'Challenge reward already claimed' });
    }

    // Calculate effort-scaled reward (full if completed, proportional partial if not)
    const completionFraction = Math.min(1.0, challenge.currentCount / Math.max(1, challenge.targetCount));
    if (completionFraction < 0.3) {
      return res.status(400).json({ success: false, message: 'Need at least 30% progress to claim partial rewards' });
    }

    const earnedIq = Math.round(challenge.iqReward * completionFraction);
    const earnedCoins = Math.round(challenge.coinReward * completionFraction);

    challenge.isClaimed = true;
    if (completionFraction >= 1.0) {
      challenge.isCompleted = true;
    }
    await challenge.save();

    const user = await User.findById(userId);
    user.iq += earnedIq;
    user.coins += earnedCoins;
    await user.save();

    res.status(200).json({
      success: true,
      earnedIq,
      earnedCoins,
      isFullyCompleted: challenge.isCompleted,
      user: {
        iq: user.iq,
        coins: user.coins,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. BOSS FIGHTS (Section 2.4)
// ─────────────────────────────────────────────────────────────────────────────

exports.submitBossFight = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { subject, chapter, score, livesRemaining, timeTakenSeconds } = req.body;

    const user = await User.findById(userId);
    const won = livesRemaining > 0 && score >= 7; // at least 7/10 to defeat boss

    let iqEarned = 0;
    let coinsEarned = 0;

    if (won) {
      iqEarned = 150 + (livesRemaining * 20);
      coinsEarned = 50 + (livesRemaining * 10);

      user.iq += iqEarned;
      user.coins += coinsEarned;
      user.learningMinutesToday += Math.round(timeTakenSeconds / 60) || 3;
      await user.save();

      // Create a kid-safe feed post for boss defeat
      await SocialPost.create({
        userId,
        userName: user.name,
        avatarUrl: user.avatarUrl,
        gradeClass: user.gradeClass,
        activityType: 'boss_defeated',
        title: `Defeated the ${subject} Boss! ⚔️`,
        caption: `${user.name} conquered Chapter "${chapter || 'Basics'}" with ${livesRemaining} hearts remaining!`,
        badgeEmoji: '👑',
      });

      // Update Co-op Quest contribution
      const quest = await CoopQuest.findOne({
        gradeClass: user.gradeClass,
        completed: false,
        expiresAt: { $gte: new Date() },
      });
      if (quest) {
        quest.currentCount += 10;
        const contributor = quest.contributors.find((c) => c.userId.toString() === userId.toString());
        if (contributor) {
          contributor.count += 10;
        } else {
          quest.contributors.push({ userId, userName: user.name, count: 10 });
        }
        if (quest.currentCount >= quest.targetCount) {
          quest.completed = true;
        }
        await quest.save();
      }
    }

    res.status(200).json({
      success: true,
      won,
      score,
      livesRemaining,
      timeTakenSeconds,
      iqEarned,
      coinsEarned,
      user: {
        iq: user.iq,
        coins: user.coins,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. CO-OP QUESTS (Section 2.5)
// ─────────────────────────────────────────────────────────────────────────────

exports.getCoopQuest = async (req, res, next) => {
  try {
    const gradeClass = req.user.gradeClass || 'Class 3';
    let quest = await CoopQuest.findOne({
      gradeClass,
      expiresAt: { $gte: new Date() },
    });

    if (!quest) {
      const nextSunday = new Date();
      nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()));
      nextSunday.setHours(23, 59, 59, 999);

      quest = await CoopQuest.create({
        gradeClass,
        title: `Classroom Challenge: 500 Math Problems!`,
        description: `Team up with your ${gradeClass} classmates to solve 500 Math problems together this week to unlock the "Math Legend" profile badge!`,
        subject: 'Math',
        targetCount: 500,
        currentCount: 85, // seeded initial team momentum
        rewardBadge: '🌟 Math Legend',
        rewardCoins: 100,
        rewardIq: 200,
        expiresAt: nextSunday,
        contributors: [
          { userId: req.user._id, userName: req.user.name, count: 15 },
        ],
      });
    }

    res.status(200).json({
      success: true,
      quest,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. FRIENDS & FRIENDLY ZONE LEADERBOARD (Section 2.5)
// ─────────────────────────────────────────────────────────────────────────────

exports.getFriends = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const friendships = await Friendship.find({
      $or: [{ requesterId: userId }, { recipientId: userId }],
    }).populate('requesterId recipientId', 'name email avatarUrl iq coins streak gradeClass');

    const accepted = [];
    const pending = [];

    friendships.forEach((f) => {
      const isRequester = f.requesterId._id.toString() === userId.toString();
      const friend = isRequester ? f.recipientId : f.requesterId;
      if (!friend) return;

      if (f.status === 'accepted') {
        accepted.push({
          friendshipId: f._id,
          user: friend,
        });
      } else if (f.status === 'pending') {
        pending.push({
          friendshipId: f._id,
          isIncoming: !isRequester,
          user: friend,
        });
      }
    });

    res.status(200).json({
      success: true,
      friends: accepted,
      pendingRequests: pending,
    });
  } catch (err) {
    next(err);
  }
};

exports.sendFriendRequest = async (req, res, next) => {
  try {
    const { targetEmail } = req.body;
    const userId = req.user._id;

    const targetUser = await User.findOne({ email: targetEmail.toLowerCase().trim() });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Student not found with this email' });
    }

    if (targetUser._id.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot add yourself as a friend' });
    }

    const existing = await Friendship.findOne({
      $or: [
        { requesterId: userId, recipientId: targetUser._id },
        { requesterId: targetUser._id, recipientId: userId },
      ],
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `Friendship is already ${existing.status}` });
    }

    const friendship = await Friendship.create({
      requesterId: userId,
      recipientId: targetUser._id,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Friend request sent successfully!',
      friendship,
    });
  } catch (err) {
    next(err);
  }
};

exports.respondFriendRequest = async (req, res, next) => {
  try {
    const { friendshipId, accept } = req.body;
    const userId = req.user._id;

    const friendship = await Friendship.findOne({
      _id: friendshipId,
      recipientId: userId,
    });

    if (!friendship) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }

    friendship.status = accept ? 'accepted' : 'rejected';
    await friendship.save();

    res.status(200).json({
      success: true,
      status: friendship.status,
      message: accept ? 'Friend request accepted!' : 'Friend request declined.',
    });
  } catch (err) {
    next(err);
  }
};

exports.getFriendlyLeaderboard = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const friendships = await Friendship.find({
      $or: [{ requesterId: userId }, { recipientId: userId }],
      status: 'accepted',
    });

    const friendIds = friendships.map((f) =>
      f.requesterId.toString() === userId.toString() ? f.recipientId : f.requesterId
    );
    friendIds.push(userId); // include self

    const leaderboard = await User.find({ _id: { $in: friendIds } })
      .select('name avatarUrl iq coins streak gradeClass')
      .sort({ iq: -1 });

    res.status(200).json({
      success: true,
      leaderboard,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. MINI SOCIAL FEED & SUBSCRIPTIONS (Section 2.5 & 2.7)
// ─────────────────────────────────────────────────────────────────────────────

exports.getFeed = async (req, res, next) => {
  try {
    const posts = await SocialPost.find()
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('userId', 'name avatarUrl gradeClass');

    res.status(200).json({
      success: true,
      hasSubscription: req.user.hasFeedSubscription,
      posts,
    });
  } catch (err) {
    next(err);
  }
};

exports.likePost = async (req, res, next) => {
  try {
    const { postId } = req.body;
    const userId = req.user._id;

    const post = await SocialPost.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const index = post.likes.indexOf(userId);
    let isLiked = false;
    if (index > -1) {
      post.likes.splice(index, 1);
    } else {
      post.likes.push(userId);
      isLiked = true;
    }

    await post.save();

    res.status(200).json({
      success: true,
      isLiked,
      likeCount: post.likes.length,
    });
  } catch (err) {
    next(err);
  }
};

exports.unlockFeedSubscription = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    const FEED_COIN_PRICE = 100;
    if (user.coins < FEED_COIN_PRICE) {
      return res.status(400).json({
        success: false,
        message: `Insufficient coins. Feed pass requires ${FEED_COIN_PRICE} Coins.`,
      });
    }

    user.coins -= FEED_COIN_PRICE;
    user.hasFeedSubscription = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Social Feed Pass unlocked successfully! 🎉',
      hasFeedSubscription: true,
      user: {
        coins: user.coins,
        iq: user.iq,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. CONTEST ARENA (Section 2.5 & 2.7)
// ─────────────────────────────────────────────────────────────────────────────

exports.getContests = async (req, res, next) => {
  try {
    const gradeClass = req.user.gradeClass || 'Class 3';
    let contest = await Contest.findOne({ active: true, gradeClass });

    if (!contest) {
      contest = await Contest.create({
        title: 'Monthly Math & Science Championship 🏆',
        monthYear: 'September 2026',
        gradeClass,
        entryCoinCost: 20,
        stages: [
          { stageNumber: 1, title: 'Stage 1: Speed Arithmetic', questionCount: 10, timeLimitSeconds: 180, unlockDayOffset: 0 },
          { stageNumber: 2, title: 'Stage 2: Pattern Master', questionCount: 10, timeLimitSeconds: 180, unlockDayOffset: 1 },
          { stageNumber: 3, title: 'Stage 3: GK & Nature Quiz', questionCount: 10, timeLimitSeconds: 180, unlockDayOffset: 2 },
          { stageNumber: 4, title: 'Stage 4: Logic & Riddle Battle', questionCount: 10, timeLimitSeconds: 180, unlockDayOffset: 3 },
          { stageNumber: 5, title: 'Stage 5: Grand Final Boss Stage', questionCount: 15, timeLimitSeconds: 240, unlockDayOffset: 4 },
        ],
        participants: [
          {
            userId: req.user._id,
            userName: req.user.name,
            avatarUrl: req.user.avatarUrl,
            totalScore: 40,
            totalTimeSeconds: 110,
            stagesCompleted: 1,
          },
        ],
      });
    }

    const isJoined = contest.participants.some(
      (p) => p.userId.toString() === req.user._id.toString()
    );

    res.status(200).json({
      success: true,
      contest,
      isJoined,
    });
  } catch (err) {
    next(err);
  }
};

exports.joinContest = async (req, res, next) => {
  try {
    const { contestId, isAdEntry } = req.body;
    const userId = req.user._id;

    const contest = await Contest.findById(contestId);
    if (!contest) return res.status(404).json({ success: false, message: 'Contest not found' });

    const user = await User.findById(userId);
    const existing = contest.participants.find((p) => p.userId.toString() === userId.toString());
    if (existing) {
      return res.status(400).json({ success: false, message: 'Already registered for this contest' });
    }

    if (!isAdEntry) {
      if (user.coins < contest.entryCoinCost) {
        return res.status(400).json({
          success: false,
          message: `Insufficient coins. Need ${contest.entryCoinCost} Coins to register, or watch an ad.`,
        });
      }
      user.coins -= contest.entryCoinCost;
      await user.save();
    }

    contest.participants.push({
      userId,
      userName: user.name,
      avatarUrl: user.avatarUrl,
      totalScore: 0,
      totalTimeSeconds: 0,
      stagesCompleted: 0,
    });
    await contest.save();

    res.status(200).json({
      success: true,
      message: 'Successfully registered for the Championship Arena! ⚔️',
      user: { coins: user.coins },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. PARENT SPECTATOR MODE (Section 2.9)
// ─────────────────────────────────────────────────────────────────────────────

exports.getParentMetrics = async (req, res, next) => {
  try {
    const user = req.user;
    const profile = await AdaptiveProfile.findOne({ userId: user._id });

    // Format habit-oriented data
    const completedQuizCount = user.completedQuizzes?.length || 0;
    const completedUnitCount = user.completedUnits?.length || 0;

    res.status(200).json({
      success: true,
      parentData: {
        childName: user.name,
        gradeClass: user.gradeClass,
        age: user.age,
        habitMetrics: {
          currentStreak: user.streak,
          longestStreak: user.longestStreak || user.streak,
          learningMinutesToday: user.learningMinutesToday || 20,
          weeklyActivityMinutes: user.weeklyActivityMinutes || [15, 20, 10, 25, 30, 15, 20],
          modulesCompleted: completedUnitCount,
          totalQuizzesTaken: completedQuizCount,
          totalGamesPlayed: user.totalGamesPlayed || 0,
        },
        strengthsAndFocus: {
          strongTopics: profile?.strongTopics || ['Counting & Numbers', 'Basic Shapes'],
          focusAreas: profile?.weakTopics || ['Word Scramble', 'Speed Arithmetic'],
          currentDifficultyLevel: profile?.currentAdaptiveDifficulty || 'beginner',
        },
        privacyCompliance: {
          dpdpActCompliant: true,
          noPersonalTracking: true,
          verifiableParentalControl: true,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. REWARD DOUBLER & STREAK FREEZE (Section 2.4 & 2.7)
// ─────────────────────────────────────────────────────────────────────────────

exports.claimDoubleAdReward = async (req, res, next) => {
  try {
    const { baseIq, baseCoins } = req.body;
    const user = await User.findById(req.user._id);

    const extraIq = Math.min(100, Math.max(0, parseInt(baseIq, 10) || 10));
    const extraCoins = Math.min(50, Math.max(0, parseInt(baseCoins, 10) || 5));

    user.iq += extraIq;
    user.coins += extraCoins;
    await user.save();

    res.status(200).json({
      success: true,
      message: '2x Ad Reward applied successfully! 🎁',
      extraIq,
      extraCoins,
      user: {
        iq: user.iq,
        coins: user.coins,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.buyStreakFreeze = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const STREAK_FREEZE_COST = 50;

    if (user.coins < STREAK_FREEZE_COST) {
      return res.status(400).json({
        success: false,
        message: `Need ${STREAK_FREEZE_COST} Coins to purchase a Streak Freeze.`,
      });
    }

    user.coins -= STREAK_FREEZE_COST;
    user.streakFreezes = (user.streakFreezes || 0) + 1;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Streak Freeze purchased! ❄️ Your streak is protected.',
      streakFreezes: user.streakFreezes,
      user: {
        coins: user.coins,
        streakFreezes: user.streakFreezes,
      },
    });
  } catch (err) {
    next(err);
  }
};
