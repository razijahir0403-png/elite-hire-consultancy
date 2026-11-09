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

const documentSubSchema = new mongoose.Schema(
  {
    fileName: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
    path: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: null },
    uploadedBy: { type: String, default: '' },
  },
  { _id: false }
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
    proofDocumentPath: {
      type: String,
      trim: true,
      default: '',
    },
    proofDocumentName: {
      type: String,
      trim: true,
      default: '',
    },
    clProofDoc: { type: documentSubSchema, default: null },
    coverLetter: { type: documentSubSchema, default: null },
    clProfileDoc: { type: documentSubSchema, default: null },
    crStatus: { type: Number, default: null },
    activeCondition: { type: String, default: null },
    onHoldDeadline: { type: Date, default: null },
    remarks: { type: String, default: '' },
    remarksHistory: [
      {
        remark: String,
        updatedBy: String,
        updatedOn: { type: Date, default: Date.now },
      },
    ],
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

clientSchema.index({ status: 1 });
clientSchema.index({ createdAt: -1 });
clientSchema.index({ isDeleted: 1, status: 1, updatedOn: -1 });
clientSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Client', clientSchema);

