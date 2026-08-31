const { validationResult } = require('express-validator');
const QuizQuestion = require('../models/QuizQuestion');
const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');

const IQ_PER_CORRECT = 10;
const COINS_PER_CORRECT = 2;

// Helper to extract numeric quiz number from string like "Quiz 1: Count to 5" or "Quiz 10"
function parseQuizNumber(quizName) {
  if (!quizName) return 0;
  const match = quizName.match(/Quiz\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
}

// ── GET /api/quiz/units?subject=Math ──────────────────────────────────────────
// Returns all units & quizzes in a flat roadmap structure sorted numerically (Quiz 1..10)
exports.getUnits = async (req, res, next) => {
  try {
    const { subject } = req.query;
    const validSubjects = ['Math', 'GK', 'English', 'Computer'];

    if (!subject || !validSubjects.includes(subject)) {
      return res.status(400).json({
        success: false,
        message: `subject query param required. Valid: ${validSubjects.join(', ')}`,
      });
    }

    // Aggregate: group questions by unit, then by quiz
    const units = await QuizQuestion.aggregate([
      { $match: { subject } },
      {
        $group: {
          _id: { unitNumber: '$unitNumber', unitName: '$unitName', quizName: '$quizName' },
          questionCount: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: { unitNumber: '$_id.unitNumber', unitName: '$_id.unitName' },
          quizzes: {
            $push: {
              quizName: '$_id.quizName',
              questionCount: '$questionCount',
            },
          },
        },
      },
      { $sort: { '_id.unitNumber': 1 } },
      {
        $project: {
          _id: 0,
          unitNumber: '$_id.unitNumber',
          unitName: '$_id.unitName',
          quizzes: 1,
        },
      },
    ]);

    const user = req.user;
    let foundCurrent = false;

    const unitsWithProgress = units.map((unit) => {
      // Sort quizzes numerically by Quiz number (Quiz 1 -> Quiz 2 ... -> Quiz 10)
      unit.quizzes.sort((a, b) => parseQuizNumber(a.quizName) - parseQuizNumber(b.quizName));

      let unitCompletedCount = 0;

      const quizzesWithProgress = unit.quizzes.map((quiz) => {
        const stars = user.getQuizStars(subject, unit.unitNumber, quiz.quizName);
        const completed = stars > 0;
        if (completed) unitCompletedCount++;

        let status = 'locked';
        if (completed) {
          status = 'completed';
        } else if (!foundCurrent) {
          status = 'current';
          foundCurrent = true; // First uncompleted quiz is the current active node
        }

        return {
          quizName: quiz.quizName,
          questionCount: quiz.questionCount,
          stars,
          completed,
          status, // 'completed' | 'current' | 'locked'
        };
      });

      let unitStatus = 'locked';
      if (unitCompletedCount === unit.quizzes.length && unit.quizzes.length > 0) {
        unitStatus = 'completed';
      } else if (quizzesWithProgress.some((q) => q.status === 'current' || q.status === 'completed')) {
        unitStatus = 'current';
      }

      return {
        unitNumber: unit.unitNumber,
        unitName: unit.unitName,
        status: unitStatus,
        quizzes: quizzesWithProgress,
      };
    });

    res.status(200).json({
      success: true,
      subject,
      units: unitsWithProgress,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/quiz/questions?subject=Math&unit=1&quiz=Quiz+1 ────────────────────
exports.getQuestions = async (req, res, next) => {
  try {
    const { subject, unit, quiz } = req.query;
    const validSubjects = ['Math', 'GK', 'English', 'Computer'];

    if (!subject || !validSubjects.includes(subject)) {
      return res.status(400).json({ success: false, message: 'Valid subject required' });
    }

    const filter = { subject };
    if (unit) filter.unitNumber = parseInt(unit);
    if (quiz) filter.quizName = quiz;

    let questions;
    if (!unit && !quiz) {
      questions = await QuizQuestion.aggregate([
        { $match: filter },
        { $sample: { size: 5 } },
      ]);
    } else {
      questions = await QuizQuestion.find(filter).sort({ _id: 1 });
    }

    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No questions found for subject ${subject}`,
      });
    }

    res.status(200).json({ success: true, count: questions.length, questions });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/quiz/submit ──────────────────────────────────────────────────────
exports.submitAttempt = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { subject, unitNumber, quizName, correctCount, totalQuestions } = req.body;
    const userId = req.user._id;

    const iqEarned = correctCount * IQ_PER_CORRECT;
    const coinsEarned = correctCount * COINS_PER_CORRECT;
    const score = Math.round((correctCount / totalQuestions) * 100);

    // Star thresholds: 1 star = 50%+, 2 stars = 75%+, 3 stars = 90%+
    let stars = 0;
    if (score >= 90) stars = 3;
    else if (score >= 75) stars = 2;
    else if (score >= 50) stars = 1;

    // Save attempt log
    await QuizAttempt.create({
      userId,
      subject,
      score,
      correctCount,
      totalQuestions,
      iqEarned,
      coinsEarned,
    });

    const user = await User.findById(userId);

    // Update existing quiz record if higher stars earned, or push new
    const existingIndex = user.completedQuizzes.findIndex(
      (q) => q.subject === subject && q.unitNumber === unitNumber && q.quizName === quizName
    );

    if (existingIndex > -1) {
      if (stars > user.completedQuizzes[existingIndex].stars) {
        user.completedQuizzes[existingIndex].stars = stars;
      }
    } else {
      user.completedQuizzes.push({
        subject,
        unitNumber,
        quizName,
        stars,
        iqEarned,
        coinsEarned,
        completedAt: new Date(),
      });
    }

    user.iq += iqEarned;
    user.coins += coinsEarned;
    user.totalQuizzesCompleted += 1;

    // ── Check Unit Mastery / Completion ────────────────────────────────────
    const unitKey = `${subject}_${unitNumber}`;
    let unitCompleted = false;
    let unitBonus = { iq: 0, coins: 0 };

    if (!user.completedUnits) user.completedUnits = [];

    if (!user.completedUnits.includes(unitKey)) {
      // Find total unique quizzes in this unit from QuizQuestion
      const totalQuizzesInUnit = await QuizQuestion.distinct('quizName', { subject, unitNumber });
      
      // Count completed quizzes in this unit with stars > 0
      const completedInUnit = user.completedQuizzes.filter(
        (q) => q.subject === subject && q.unitNumber === unitNumber && q.stars > 0
      );

      // If user finished all quizzes in this unit
      if (totalQuizzesInUnit.length > 0 && completedInUnit.length >= totalQuizzesInUnit.length) {
        unitCompleted = true;
        unitBonus = { iq: 50, coins: 25 };
        user.completedUnits.push(unitKey);
        user.iq += unitBonus.iq;
        user.coins += unitBonus.coins;

        // Advance unlocked unit if on current unit
        if (user.currentUnitBySubject && user.currentUnitBySubject[subject] <= unitNumber) {
          user.currentUnitBySubject[subject] = Math.min(10, unitNumber + 1);
        }
      }
    }

    await user.save();

    res.status(201).json({
      success: true,
      score,
      stars,
      rewards: {
        iqEarned,
        coinsEarned,
        totalIqGained: iqEarned + unitBonus.iq,
        totalCoinsGained: coinsEarned + unitBonus.coins,
      },
      unitCompleted,
      unitBonus,
      nextUnitUnlocked: user.currentUnitBySubject?.[subject] || unitNumber + 1,
      user: {
        iq: user.iq,
        coins: user.coins,
      },
    });
  } catch (err) {
    next(err);
  }
};
