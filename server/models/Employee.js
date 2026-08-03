const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');

const employeeSchema = new mongoose.Schema(
  {
    employeeCode: {
      type: String,
      required: [true, 'Please provide an Employee Code'],
      unique: true,
      trim: true,
    },
    employeeName: {
      type: String,
      required: [true, 'Please provide an Employee Name'],
      trim: true,
    },
    dob: {
      type: Date,
      required: [true, 'Please provide Date of Birth'],
    },
    bloodGroup: {
      type: String,
      trim: true,
      default: '',
    },
    contactNumber: {
      type: String,
      required: [true, 'Please provide Contact Number'],
      trim: true,
      validate: {
        validator(v) {
          if (!v) return true;
          return /^\d{10}$/.test(v);
        },
        message: 'Contact number must be exactly 10 digits',
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
    homeAddress: {
      type: String,
      trim: true,
      default: '',
    },
    domain: {
      type: String,
      required: [true, 'Please provide a domain'],
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
  },
  {
    timestamps: true,
    collection: 'employees',
  }
);

employeeSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Employee', employeeSchema);
