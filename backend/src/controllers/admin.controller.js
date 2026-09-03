const bcrypt = require('bcryptjs');
const User = require('../models/User');
const QuizQuestion = require('../models/QuizQuestion');
const ShopItem = require('../models/ShopItem');
const AuditLog = require('../models/AuditLog');
const SystemConfig = require('../models/SystemConfig');
const BroadcastMessage = require('../models/BroadcastMessage');
const QuizAttempt = require('../models/QuizAttempt');

// Helper to log audit actions
const recordAudit = async (req, action, resource, resourceId, details) => {
  try {
    await AuditLog.create({
      adminId: req.user._id,
      adminEmail: req.user.email,
      adminRole: req.user.role || 'admin',
      action,
      resource,
      resourceId: resourceId ? String(resourceId) : null,
      details,
      ipAddress: req.ip || req.connection?.remoteAddress || '127.0.0.1',
    });
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
};

// Helper to get or initialize SystemConfig
const getOrCreateConfig = async () => {
  let config = await SystemConfig.findOne({ key: 'global_settings' });
  if (!config) {
    config = await SystemConfig.create({ key: 'global_settings' });
  }
  return config;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. DASHBOARD & STATS (Section 1.1)
// ─────────────────────────────────────────────────────────────────────────────
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalStudents,
      totalQuestions,
      totalStoreItems,
      totalQuizzesAttempted,
      config,
      activeBroadcasts,
      recentUsers,
      subjectBreakdown,
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      QuizQuestion.countDocuments(),
      ShopItem.countDocuments(),
      QuizAttempt.countDocuments(),
      getOrCreateConfig(),
      BroadcastMessage.countDocuments({ active: true }),
      User.find().sort({ createdAt: -1 }).limit(6).select('name email iq coins streak gradeClass role createdAt isBanned'),
      QuizQuestion.aggregate([
        { $group: { _id: '$subject', count: { $sum: 1 } } },
      ]),
    ]);

    // Aggregate economy coins & total IQ
    const economyStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalCoins: { $sum: '$coins' },
          totalIq: { $sum: '$iq' },
          avgStreak: { $avg: '$streak' },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        totalQuestions,
        totalStoreItems,
        totalQuizzesAttempted,
        totalCoinsCirculating: economyStats[0]?.totalCoins || 0,
        totalIqEarned: economyStats[0]?.totalIq || 0,
        avgStreak: Math.round(economyStats[0]?.avgStreak || 0),
        doubleXpEnabled: config.doubleXpEnabled,
        baseXpMultiplier: config.baseXpMultiplier,
        activeBroadcasts,
        subjectBreakdown,
        recentUsers,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 1.1 CONTENT & QUESTION BANK MANAGEMENT (Section 1.1)
// ─────────────────────────────────────────────────────────────────────────────
exports.getQuestions = async (req, res, next) => {
  try {
    const { subject, gradeClass, difficulty, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (subject && subject !== 'All') filter.subject = subject;
    if (gradeClass && gradeClass !== 'All') filter.gradeClass = gradeClass;
    if (difficulty && difficulty !== 'All') filter.difficulty = difficulty;
    if (search) {
      filter.$or = [
        { question: { $regex: search, $options: 'i' } },
        { quizName: { $regex: search, $options: 'i' } },
        { unitName: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [questions, total] = await Promise.all([
      QuizQuestion.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      QuizQuestion.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      questions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.createQuestion = async (req, res, next) => {
  try {
    const {
      subject,
      gradeClass = 'Class 3',
      chapter = 'Chapter 1',
      unitNumber,
      unitName,
      quizName,
      question,
      type = 'MCQ',
      options,
      correctAnswer,
      imageAsset,
      explanation,
      difficulty = 'easy',
    } = req.body;

    if (!subject || !unitNumber || !unitName || !quizName || !question || !options || !correctAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Missing required question fields (subject, unitNumber, unitName, quizName, question, options, correctAnswer)',
      });
    }

    const optList = Array.isArray(options) ? options : options.split(',').map((o) => o.trim());
    const correctIndex = optList.findIndex((opt) => opt.trim() === correctAnswer.trim());

    const newQuestion = await QuizQuestion.create({
      subject,
      gradeClass,
      chapter,
      unitNumber: parseInt(unitNumber, 10),
      unitName,
      quizName,
      question,
      type,
      options: optList,
      correctAnswer: correctAnswer.trim(),
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
      imageAsset: imageAsset || null,
      explanation: explanation || null,
      difficulty,
    });

    await recordAudit(req, 'CREATE_QUESTION', 'QuizQuestion', newQuestion._id, {
      subject,
      gradeClass,
      question: question.substring(0, 60),
    });

    res.status(201).json({ success: true, question: newQuestion });
  } catch (err) {
    next(err);
  }
};

exports.updateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.options && updates.correctAnswer) {
      const optList = Array.isArray(updates.options)
        ? updates.options
        : updates.options.split(',').map((o) => o.trim());
      updates.options = optList;
      const correctIdx = optList.findIndex((opt) => opt.trim() === updates.correctAnswer.trim());
      updates.correctIndex = correctIdx >= 0 ? correctIdx : 0;
    }

    const question = await QuizQuestion.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    await recordAudit(req, 'UPDATE_QUESTION', 'QuizQuestion', id, { updates });

    res.status(200).json({ success: true, question });
  } catch (err) {
    next(err);
  }
};

exports.deleteQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const question = await QuizQuestion.findByIdAndDelete(id);

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    await recordAudit(req, 'DELETE_QUESTION', 'QuizQuestion', id, {
      question: question.question.substring(0, 60),
    });

    res.status(200).json({ success: true, message: 'Question deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 1.2 USER & ACCOUNT MANAGEMENT (Section 1.2)
// ─────────────────────────────────────────────────────────────────────────────
exports.searchStudents = async (req, res, next) => {
  try {
    const { search, role, gradeClass, isBanned, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (role && role !== 'All') filter.role = role;
    if (gradeClass && gradeClass !== 'All') filter.gradeClass = gradeClass;
    if (isBanned !== undefined && isBanned !== 'All') {
      filter.isBanned = isBanned === 'true';
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ lastLoginAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-passwordHash'),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getStudentDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Get recent quiz attempts and audit logs for this user
    const [recentAttempts, userLogs] = await Promise.all([
      QuizAttempt.find({ userId: id }).sort({ createdAt: -1 }).limit(10),
      AuditLog.find({ resourceId: id }).sort({ createdAt: -1 }).limit(10),
    ]);

    res.status(200).json({
      success: true,
      user,
      recentAttempts,
      auditHistory: userLogs,
    });
  } catch (err) {
    next(err);
  }
};

exports.toggleBanStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isBanned = !user.isBanned;
    if (user.isBanned) {
      user.forceLogoutBefore = new Date();
    }
    await user.save({ validateBeforeSave: false });

    await recordAudit(
      req,
      user.isBanned ? 'BAN_USER' : 'UNBAN_USER',
      'User',
      user._id,
      { email: user.email, reason: reason || 'Admin action' }
    );

    res.status(200).json({
      success: true,
      message: `User has been ${user.isBanned ? 'banned' : 'unbanned'} successfully.`,
      isBanned: user.isBanned,
    });
  } catch (err) {
    next(err);
  }
};

exports.resetStudentPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const user = await User.findByIdAndUpdate(
      id,
      {
        passwordHash,
        forceLogoutBefore: new Date(),
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await recordAudit(req, 'RESET_PASSWORD', 'User', user._id, {
      email: user.email,
    });

    res.status(200).json({
      success: true,
      message: `Password reset successfully for ${user.email}. User has been logged out of all active sessions.`,
    });
  } catch (err) {
    next(err);
  }
};

exports.forceLogoutStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      id,
      { forceLogoutBefore: new Date() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await recordAudit(req, 'FORCE_LOGOUT', 'User', user._id, {
      email: user.email,
    });

    res.status(200).json({
      success: true,
      message: `User ${user.email} has been forced to log out.`,
    });
  } catch (err) {
    next(err);
  }
};

exports.adjustStudentCurrency = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { iqDelta = 0, coinsDelta = 0, reason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.iq = Math.max(0, user.iq + parseInt(iqDelta, 10));
    user.coins = Math.max(0, user.coins + parseInt(coinsDelta, 10));
    await user.save({ validateBeforeSave: false });

    await recordAudit(req, 'ADJUST_CURRENCY', 'User', user._id, {
      email: user.email,
      iqDelta,
      coinsDelta,
      newIq: user.iq,
      newCoins: user.coins,
      reason: reason || 'Administrative adjustment',
    });

    res.status(200).json({
      success: true,
      message: `Adjusted user balance. Current IQ: ${user.iq}, Coins: ${user.coins}`,
      user: { id: user._id, iq: user.iq, coins: user.coins },
    });
  } catch (err) {
    next(err);
  }
};

exports.restoreStudentStreak = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { streakCount = 1, reason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const previousStreak = user.streak;
    user.streak = parseInt(streakCount, 10);
    if (user.streak > user.longestStreak) {
      user.longestStreak = user.streak;
    }
    user.lastActiveDate = new Date();
    await user.save({ validateBeforeSave: false });

    await recordAudit(req, 'RESTORE_STREAK', 'User', user._id, {
      email: user.email,
      previousStreak,
      restoredStreak: user.streak,
      reason: reason || 'Streak restoration',
    });

    res.status(200).json({
      success: true,
      message: `Streak updated to ${user.streak} days.`,
      streak: user.streak,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 1.3 ENGAGEMENT & COMMUNICATION TOOLS (Section 1.3)
// ─────────────────────────────────────────────────────────────────────────────
exports.getSystemConfig = async (req, res, next) => {
  try {
    const config = await getOrCreateConfig();
    res.status(200).json({ success: true, config });
  } catch (err) {
    next(err);
  }
};

exports.updateSystemConfig = async (req, res, next) => {
  try {
    const {
      doubleXpEnabled,
      baseXpMultiplier,
      bossBattleXpMultiplier,
      doubleXpTitle,
      streakReminderEnabled,
      streakReminderHour,
      inactivityThresholdDays,
    } = req.body;

    const config = await getOrCreateConfig();

    if (doubleXpEnabled !== undefined) config.doubleXpEnabled = doubleXpEnabled;
    if (baseXpMultiplier !== undefined) config.baseXpMultiplier = parseFloat(baseXpMultiplier);
    if (bossBattleXpMultiplier !== undefined) config.bossBattleXpMultiplier = parseFloat(bossBattleXpMultiplier);
    if (doubleXpTitle !== undefined) config.doubleXpTitle = doubleXpTitle;
    if (streakReminderEnabled !== undefined) config.streakReminderEnabled = streakReminderEnabled;
    if (streakReminderHour !== undefined) config.streakReminderHour = parseInt(streakReminderHour, 10);
    if (inactivityThresholdDays !== undefined) config.inactivityThresholdDays = parseInt(inactivityThresholdDays, 10);

    config.updatedBy = req.user._id;
    await config.save();

    await recordAudit(req, 'UPDATE_CONFIG', 'SystemConfig', config._id, req.body);

    res.status(200).json({ success: true, message: 'Settings updated successfully', config });
  } catch (err) {
    next(err);
  }
};

exports.getBroadcasts = async (req, res, next) => {
  try {
    const broadcasts = await BroadcastMessage.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, broadcasts });
  } catch (err) {
    next(err);
  }
};

exports.createBroadcast = async (req, res, next) => {
  try {
    const { title, message, type = 'info', targetClass = 'All', endDate } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    const broadcast = await BroadcastMessage.create({
      title,
      message,
      type,
      targetClass,
      endDate: endDate ? new Date(endDate) : null,
      createdBy: req.user._id,
      active: true,
    });

    await recordAudit(req, 'CREATE_BROADCAST', 'BroadcastMessage', broadcast._id, { title, type });

    res.status(201).json({ success: true, broadcast });
  } catch (err) {
    next(err);
  }
};

exports.toggleBroadcast = async (req, res, next) => {
  try {
    const { id } = req.params;
    const broadcast = await BroadcastMessage.findById(id);
    if (!broadcast) {
      return res.status(404).json({ success: false, message: 'Broadcast not found' });
    }

    broadcast.active = !broadcast.active;
    await broadcast.save();

    await recordAudit(req, 'TOGGLE_BROADCAST', 'BroadcastMessage', id, { active: broadcast.active });

    res.status(200).json({ success: true, broadcast });
  } catch (err) {
    next(err);
  }
};

exports.deleteBroadcast = async (req, res, next) => {
  try {
    const { id } = req.params;
    const broadcast = await BroadcastMessage.findByIdAndDelete(id);
    if (!broadcast) {
      return res.status(404).json({ success: false, message: 'Broadcast not found' });
    }

    await recordAudit(req, 'DELETE_BROADCAST', 'BroadcastMessage', id, { title: broadcast.title });

    res.status(200).json({ success: true, message: 'Broadcast deleted' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 1.4 STORE MANAGER (Section 1.4)
// ─────────────────────────────────────────────────────────────────────────────
exports.getStoreItems = async (req, res, next) => {
  try {
    const items = await ShopItem.find().sort({ coinCost: 1 });
    res.status(200).json({ success: true, items });
  } catch (err) {
    next(err);
  }
};

exports.createStoreItem = async (req, res, next) => {
  try {
    const { _id, name, description, coinCost, category = 'avatar', imageAsset, emoji, badge, isAvailable = true } = req.body;
    if (!_id || !name || coinCost === undefined) {
      return res.status(400).json({ success: false, message: 'Item ID (_id), name, and coinCost are required' });
    }

    const newItem = await ShopItem.create({
      _id,
      name,
      description,
      coinCost: parseInt(coinCost, 10),
      category,
      imageAsset: imageAsset || 'assets/images/kido_character.png',
      emoji: emoji || '🎁',
      badge: badge || null,
      isAvailable: Boolean(isAvailable),
    });

    await recordAudit(req, 'CREATE_STORE_ITEM', 'ShopItem', newItem._id, { name, coinCost, category });

    res.status(201).json({ success: true, item: newItem });
  } catch (err) {
    next(err);
  }
};

exports.updateStoreItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await ShopItem.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Store item not found' });
    }

    await recordAudit(req, 'UPDATE_STORE_ITEM', 'ShopItem', id, req.body);

    res.status(200).json({ success: true, item });
  } catch (err) {
    next(err);
  }
};

exports.deleteStoreItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await ShopItem.findByIdAndDelete(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Store item not found' });
    }

    await recordAudit(req, 'DELETE_STORE_ITEM', 'ShopItem', id, { name: item.name });

    res.status(200).json({ success: true, message: 'Store item deleted' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 1.5 AUDIT LOGS (Section 1.5)
// ─────────────────────────────────────────────────────────────────────────────
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { action, resource, search, page = 1, limit = 30 } = req.query;

    const filter = {};
    if (action && action !== 'All') filter.action = action;
    if (resource && resource !== 'All') filter.resource = resource;
    if (search) {
      filter.$or = [
        { adminEmail: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
        { resourceId: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};
