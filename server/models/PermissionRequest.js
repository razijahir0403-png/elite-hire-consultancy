const mongoose = require('mongoose');

const permissionRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      trim: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    employeeCode: {
      type: String,
      default: '',
      trim: true,
    },
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    employeeEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    permissionDate: {
      type: String, // YYYY-MM-DD
      required: true,
      trim: true,
      index: true,
    },
    permissionType: {
      type: String,
      enum: [
        'Personal Work',
        'Medical Appointment',
        'Medical',
        'Official Work',
        'Official Permission',
        'Emergency',
        'Early Departure',
        'Late Arrival',
        'Other',
      ],
      default: 'Personal Work',
      required: true,
    },
    fromTime: {
      type: String, // e.g. "10:00" (HH:mm)
      required: true,
      trim: true,
    },
    toTime: {
      type: String, // e.g. "14:00" (HH:mm)
      required: true,
      trim: true,
    },
    totalMinutes: {
      type: Number,
      required: true,
    },
    totalHours: {
      type: Number, // decimal hours e.g. 4 or 2.5
      required: true,
    },
    monthKey: {
      type: String, // "YYYY-MM"
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    adminRemarks: {
      type: String,
      default: '',
      trim: true,
    },
    reviewedBy: {
      type: String,
      default: null,
      trim: true,
    },
    reviewedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'permission_requests',
  }
);

permissionRequestSchema.index({ employeeEmail: 1, permissionDate: 1 });
permissionRequestSchema.index({ employeeEmail: 1, monthKey: 1, status: 1 });
permissionRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('PermissionRequest', permissionRequestSchema);
