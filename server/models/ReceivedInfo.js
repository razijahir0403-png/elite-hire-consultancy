const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');

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
    updatedBy: {
      type: String,
      required: true,
    },
    updatedOn: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'receivedinfos',
  }
);

receivedInfoSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('ReceivedInfo', receivedInfoSchema);
