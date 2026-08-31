const { validationResult } = require('express-validator');
const ShopItem = require('../models/ShopItem');
const User = require('../models/User');

// ── GET /api/shop/items ────────────────────────────────────────────────────────
exports.getItems = async (req, res, next) => {
  try {
    const items = await ShopItem.find({ isActive: true });
    res.status(200).json({ success: true, count: items.length, items });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/shop/purchase ────────────────────────────────────────────────────
exports.purchaseItem = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { itemId } = req.body;
    const userId = req.user._id;

    // Check item exists
    const item = await ShopItem.findById(itemId);
    if (!item || !item.isActive) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Check not already owned
    if (req.user.ownedItemIds.includes(itemId)) {
      return res.status(400).json({ success: false, message: 'You already own this item' });
    }

    // Check sufficient coins
    if (req.user.coins < item.coinCost) {
      return res.status(400).json({
        success: false,
        message: `Not enough coins! You need ${item.coinCost} coins but have ${req.user.coins}.`,
      });
    }

    // Deduct coins and add item atomically
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { coins: -item.coinCost },
        $push: { ownedItemIds: itemId },
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `${item.emoji} ${item.name} purchased!`,
      coins: updatedUser.coins,
      ownedItemIds: updatedUser.ownedItemIds,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/shop/owned ────────────────────────────────────────────────────────
exports.getOwnedItems = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      ownedItemIds: req.user.ownedItemIds,
    });
  } catch (err) {
    next(err);
  }
};
