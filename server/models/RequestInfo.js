const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');
const { RECRUITMENT_STATUS_MAX } = require('../utils/statusMaster');

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: Number,
      required: true,
      min: 0,
      max: RECRUITMENT_STATUS_MAX,
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

const requestInfoSchema = new mongoose.Schema(
  {
    idnumber: {
      type: String,
      required: [true, 'Please provide an ID number'],
      unique: true,
      trim: true,
    },
    companyName: {
      type: String,
      required: [true, 'Please provide a company name'],
      trim: true,
    },
    domain: {
      type: String,
      required: [true, 'Please provide a domain'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Please provide a location'],
      trim: true,
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
    contactNumber: {
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
    resourcePerson: {
      type: String,
      trim: true,
      default: '',
    },
    portalLink: {
      type: String,
      trim: true,
    },
    status: {
      type: Number,
      required: [true, 'Please choose a status'],
      default: 0,
      min: 0,
      max: RECRUITMENT_STATUS_MAX,
    },
    description: {
      type: String,
      trim: true,
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
    collection: 'requestinfos',
  }
);

requestInfoSchema.plugin(softDeletePlugin);

requestInfoSchema.index({ companyName: 1 });
requestInfoSchema.index({ status: 1 });
requestInfoSchema.index({ createdAt: -1 });

module.exports = mongoose.model('RequestInfo', requestInfoSchema);
