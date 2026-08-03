const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employeeName: {
      type: String,
      required: true,
      trim: true
    },
    employeeEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    loginDate: {
      type: String,
      required: true,
      // Format: YYYY-MM-DD
    },
    firstLoginTime: {
      type: Date,
      required: true
    },
    logoutTime: {
      type: Date,
      default: null
    },
    totalHours: {
      type: String,
      default: null
    },
    workMode: {
      type: String,
      enum: ['WFH', 'WFO'],
      required: true
    },
    status: {
      type: String,
      default: 'Present'
    },
    sessionStatus: {
      type: String,
      enum: ['Active', 'Ended', 'Logged Out', 'Auto Logged Out'],
      default: 'Active'
    },
    sessions: [
      {
        loginTime: {
          type: Date,
          required: true
        },
        endTime: {
          type: Date,
          default: null
        },
        type: {
          type: String,
          enum: ['Active', 'End Session', 'Logout', 'Auto Logout'],
          default: 'Active'
        }
      }
    ]
  },
  { timestamps: true }
);

// Prevent multiple attendance records for the same employee per day
attendanceSchema.index({ employeeEmail: 1, loginDate: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
