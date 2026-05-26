const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: Number,
      required: true,
      min: 0,
      max: 16,
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
    contactNumber: {
      type: String,
      required: [true, 'Please provide a mobile number'],
      trim: true,
      validate: {
        validator: (v) => /^\d{10}$/.test(v),
        message: 'Mobile number must be exactly 10 digits',
      },
    },
    resourcePerson: {
      type: String,
      required: [true, 'Please provide a resource person name'],
      trim: true,
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
      max: 16,
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

module.exports = mongoose.model('RequestInfo', requestInfoSchema);
