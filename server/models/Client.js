const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');
const { CLIENT_STATUS_MAX } = require('../utils/clientStatusMaster');

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: Number,
      required: true,
      min: 0,
      max: CLIENT_STATUS_MAX,
    },
    description: {
      type: String,
      required: true,
    },
    updatedBy: {
      type: String,
      required: true,
    },
    updatedOn: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const clientSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      required: [true, 'Please provide a client ID'],
      unique: true,
      trim: true,
    },
    clientName: {
      type: String,
      required: [true, 'Please provide a client name'],
      trim: true,
    },
    mobile: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator(v) {
          if (!v) return true;
          return /^\d{10}$/.test(v);
        },
        message: 'Mobile number must be exactly 10 digits',
      },
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      validate: {
        validator(v) {
          if (!v) return true;
          return /^\S+@\S+\.\S+$/.test(v);
        },
        message: 'Please provide a valid email address',
      },
    },
    category: {
      type: String,
      required: [true, 'Please provide a category'],
      trim: true,
      maxlength: [200, 'Category must not exceed 200 characters'],
    },
    profileDocumentPath: {
      type: String,
      trim: true,
      default: '',
    },
    profileDocumentName: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: Number,
      required: [true, 'Please choose a status'],
      default: 0,
      min: 0,
      max: CLIENT_STATUS_MAX,
    },
    description: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
    updatedBy: {
      type: String,
      required: true,
    },
    updatedOn: {
      type: Date,
      default: Date.now,
    },
    statusHistory: [statusHistorySchema],
  },
  {
    timestamps: true,
    collection: 'clients',
  }
);

clientSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Client', clientSchema);
