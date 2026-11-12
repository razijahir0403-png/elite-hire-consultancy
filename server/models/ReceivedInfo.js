const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');

const receivedInfoStatusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: mongoose.Schema.Types.Mixed, // Integer (1-16); Mixed for backwards compatibility with legacy strings
      required: true,
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

const receivedInfoSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: [true, 'Please provide a request ID'],
      unique: true,
      trim: true,
    },
    domain: {
      type: String,
      required: [true, 'Please provide a domain'],
      trim: true,
    },
    companyName: {
      type: String,
      required: [true, 'Please provide a company name'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Please provide a location'],
      trim: true,
    },
    resourceName: {
      type: String,
      required: [true, 'Please provide a resource name'],
      trim: true,
    },
    mobileNumber: {
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
    vendor: {
      type: String,
      required: [true, 'Please choose a vendor'],
      enum: {
        values: ['HR Circle', 'Talvixa', 'Job Updates', 'MagicBus', 'Other Vendor'],
        message: '{VALUE} is not a valid vendor',
      },
      trim: true,
    },
    logDescription: {
      type: String,
      trim: true,
    },
    status: {
      type: mongoose.Schema.Types.Mixed, // Integer (1-16); Mixed for backwards compatibility with legacy strings
      default: null,
    },
    initialStatus: {
      type: mongoose.Schema.Types.Mixed, // Integer (1-16); Mixed for backwards compatibility with legacy strings
      default: null,
    },
    currentStatus: {
      type: mongoose.Schema.Types.Mixed, // Integer (1-16); Mixed for backwards compatibility with legacy strings
      default: null,
    },
    updatedBy: {
      type: String,
      required: true,
    },
    updatedOn: {
      type: Date,
      default: Date.now,
    },
    statusHistory: [receivedInfoStatusHistorySchema],

    // Document fields for audit trail
    proposalRequest: {
      fileName: { type: String, default: '', trim: true },
      name: { type: String, default: '', trim: true },
      fileUrl: { type: String, default: '', trim: true },
      path: { type: String, default: '', trim: true },
      fileSize: { type: Number, default: 0 },
      size: { type: Number, default: 0 },
      uploadedAt: { type: Date },
      uploadedBy: { type: String, default: '', trim: true },
    },
    contractAgreement: {
      fileName: { type: String, default: '', trim: true },
      name: { type: String, default: '', trim: true },
      fileUrl: { type: String, default: '', trim: true },
      path: { type: String, default: '', trim: true },
      fileSize: { type: Number, default: 0 },
      size: { type: Number, default: 0 },
      uploadedAt: { type: Date },
      uploadedBy: { type: String, default: '', trim: true },
    },
    mouFile: {
      fileName: { type: String, default: '', trim: true },
      originalName: { type: String, default: '', trim: true },
      name: { type: String, default: '', trim: true },
      fileType: { type: String, default: '', trim: true },
      fileUrl: { type: String, default: '', trim: true },
      path: { type: String, default: '', trim: true },
      fileSize: { type: Number, default: 0 },
      size: { type: Number, default: 0 },
      uploadedAt: { type: Date },
      uploadedBy: { type: String, default: '', trim: true },
      recordId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReceivedInfo' },
    },
    // Conditions Required fields
    crStatus: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    riStatus: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    conditionsRequired: {
      dataUploaded: { type: Boolean, default: false },
      onHold: { type: Boolean, default: false },
      emailSent: { type: Boolean, default: false },
      sentFollowupMessage: { type: Boolean, default: false },
      proposalReqSub: { type: Boolean, default: false },
      docSub: { type: Boolean, default: false },
      acceptCgp: { type: Boolean, default: false },
      placementRecruitment: { type: Boolean, default: false },
      cancelled: { type: Boolean, default: false },
      completed: { type: Boolean, default: false },
      contractCancelled: { type: Boolean, default: false },
    },
    activeCondition: {
      type: String,
      trim: true,
      default: '',
    },
    onHoldDeadline: {
      type: Date,
      default: null,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
    remarksHistory: [
      {
        remark: { type: String, required: true },
        crStatus: { type: Number, default: null },
        riStatus: { type: Number, default: null },
        updatedBy: { type: String, required: true },
        updatedOn: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    collection: 'receivedinfos',
  }
);

receivedInfoSchema.plugin(softDeletePlugin);

receivedInfoSchema.index({ vendor: 1 });
receivedInfoSchema.index({ createdAt: -1 });
receivedInfoSchema.index({ isDeleted: 1, vendor: 1, createdAt: -1 });
receivedInfoSchema.index({ isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model('ReceivedInfo', receivedInfoSchema);