const mongoose = require('mongoose');

const broadcastMessageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Broadcast title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Broadcast message is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['info', 'warning', 'event', 'maintenance'],
      default: 'info',
    },
    targetClass: {
      type: String,
      default: 'All', // 'All', 'Class 1', 'Class 2' ...
    },
    active: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

broadcastMessageSchema.index({ active: 1, createdAt: -1 });

module.exports = mongoose.model('BroadcastMessage', broadcastMessageSchema);
