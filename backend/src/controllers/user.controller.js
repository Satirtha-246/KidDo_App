const { validationResult } = require('express-validator');
const User = require('../models/User');

// ── GET /api/users/profile ─────────────────────────────────────────────────────
exports.getProfile = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, user: req.user });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/users/profile ───────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const allowed = ['name', 'avatarUrl', 'activeTheme', 'activeAvatar', 'age', 'gradeClass'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/users/leaderboard ─────────────────────────────────────────────────
exports.getLeaderboard = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const users = await User.find()
      .sort({ iq: -1 })
      .limit(limit)
      .select('name avatarUrl iq coins streak');

    res.status(200).json({ success: true, count: users.length, users });
  } catch (err) {
    next(err);
  }
};
