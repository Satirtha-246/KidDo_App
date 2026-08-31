const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

// ── Helper ─────────────────────────────────────────────────────────────────────
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });

const sendAuthResponse = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user,
  });
};

// ── POST /api/auth/register ────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, age, gradeClass } = req.body;

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      passwordHash,
      age: age ? parseInt(age, 10) : 8,
      gradeClass: gradeClass || 'Class 3',
    });

    sendAuthResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/login ───────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user with passwordHash included
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Update streak if needed
    const today = new Date();
    const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (!lastActive) {
      user.streak = 1;
    } else if (lastActive.toDateString() === yesterday.toDateString()) {
      user.streak += 1; // consecutive day
    } else if (lastActive.toDateString() !== today.toDateString()) {
      user.streak = 1; // streak broken
    }
    user.lastActiveDate = today;
    await user.save({ validateBeforeSave: false });

    sendAuthResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/auth/me ───────────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    // req.user is attached by protect middleware
    res.status(200).json({ success: true, user: req.user });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/forgot-password ─────────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account with that email was found.' });
    }

    // In a full production app, generate token & send via nodemailer
    return res.status(200).json({
      success: true,
      message: 'Password reset link has been sent to your email address.',
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/google ──────────────────────────────────────────────────────
exports.googleAuth = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, name, googleId, avatarUrl, age, gradeClass } = req.body;

    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        googleId: googleId || `google_${Date.now()}`,
        avatarUrl: avatarUrl || 'assets/images/KidDo Character.png',
        age: age ? parseInt(age, 10) : 8,
        gradeClass: gradeClass || 'Class 3',
        hasCompletedOnboarding: Boolean(age && gradeClass),
      });
    } else {
      if (googleId && !user.googleId) {
        user.googleId = googleId;
      }
      if (age && gradeClass) {
        user.age = parseInt(age, 10);
        user.gradeClass = gradeClass;
        user.hasCompletedOnboarding = true;
      }
      await user.save({ validateBeforeSave: false });
    }

    const token = signToken(user._id);
    res.status(200).json({
      success: true,
      token,
      user,
      isNewUser,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/complete-onboarding ─────────────────────────────────────────
exports.completeOnboarding = async (req, res, next) => {
  try {
    const { name, age, gradeClass, avatarUrl } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (age) user.age = parseInt(age, 10);
    if (gradeClass) user.gradeClass = gradeClass;
    if (avatarUrl) user.avatarUrl = avatarUrl;
    user.hasCompletedOnboarding = true;

    await user.save({ validateBeforeSave: false });
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};


