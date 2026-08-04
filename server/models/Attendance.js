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
    workMode: {
      type: String,
      enum: ['WFH', 'WFO'],
      required: true
    },
    status: {
      type: String,
      default: 'Present'
    },
    sessions: [
      {
        loginTime: { type: Date, required: true },
        logoutTime: { type: Date, default: null },
        logoutReason: { type: String, default: null }, // e.g. 'End Session', 'Logout', 'Auto Logout'
        durationSeconds: { type: Number, default: 0 }
      }
    ],
    totalWorkingSeconds: {
      type: Number,
      default: 0
    },
    totalWorkingHoursDisplay: {
      type: String,
      default: '00:00:00'
    },
    lastLogin: {
      type: Date,
      default: null
    },
    lastLogout: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Prevent multiple attendance records for the same employee per day
attendanceSchema.index({ employeeEmail: 1, loginDate: 1 }, { unique: true });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ workMode: 1 });
attendanceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
