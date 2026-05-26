const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: {
      type: String,
      trim: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
    },
    resourceType: {
      type: String,
      trim: true,
    },
    resourceId: {
      type: String,
      trim: true,
    },
    method: {
      type: String,
      trim: true,
    },
    path: {
      type: String,
      trim: true,
    },
    ip: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    statusCode: {
      type: Number,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'activitylogs',
  }
);

activityLogSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
