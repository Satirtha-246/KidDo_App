const mongoose = require('mongoose');

const shopItemSchema = new mongoose.Schema(
  {
    _id: {
      type: String, // e.g. 'avatar_star', 'theme_dark'
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    imageAsset: {
      type: String,
      required: true,
    },
    coinCost: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      enum: ['avatar', 'theme', 'powerUp'],
      required: true,
    },
    emoji: {
      type: String,
      default: '⭐',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    _id: false, // use our own string _id
  }
);

module.exports = mongoose.model('ShopItem', shopItemSchema);
