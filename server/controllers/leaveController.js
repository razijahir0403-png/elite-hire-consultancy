const LeaveRequest = require('../models/LeaveRequest');
const Employee = require('../models/Employee');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const moment = require('moment-timezone');

// 1. Submit Leave / OD Request (Authenticated Employee)
const applyLeave = asyncHandler(async (req, res) => {
  const { requestDate, requestType, reason } = req.body;

  if (!requestType || !['CL', 'SL', 'OD'].includes(requestType)) {
    throw new AppError('Invalid request type. Must be CL (Casual Leave), SL (Sick Leave), or OD (On Duty).', 400);
  }

  if (!requestDate || !/^\d{4}-\d{2}-\d{2}$/.test(requestDate)) {
    throw new AppError('Valid request date is required (YYYY-MM-DD format).', 400);
  }

  // Validate date in Asia/Kolkata timezone
  const todayKolkata = moment().tz('Asia/Kolkata').startOf('day');
  const targetDate = moment.tz(requestDate, 'YYYY-MM-DD', 'Asia/Kolkata').startOf('day');

  if (!targetDate.isValid()) {
    throw new AppError('Invalid date provided.', 400);
  }

  // Must be upcoming date (today or future in Asia/Kolkata)
  if (targetDate.isBefore(todayKolkata)) {
    throw new AppError('Cannot apply leave/OD for past dates.', 400);
  }

  // Weekends are already Week Off
  const dayOfWeek = targetDate.day();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    throw new AppError('Leave/OD cannot be applied for weekends (Saturday or Sunday) as they are Week Offs.', 400);
  }

  const normalizedEmail = req.user.email.trim().toLowerCase();

  // Prevent multiple active requests for the same employee and date
  const existingActive = await LeaveRequest.findOne({
    employeeEmail: normalizedEmail,
    requestDate,
    status: { $in: ['Pending', 'Approved'] }
  });

  if (existingActive) {
    throw new AppError(
      `A ${existingActive.requestType} request is already ${existingActive.status.toLowerCase()} for this date (${requestDate}).`,
      400
    );
  }

  // Look up Employee profile
  const employee = await Employee.findOne({
    email: normalizedEmail,
    deletedAt: null
  }).lean();

  const employeeName = employee?.employeeName || req.user.name || 'Employee';
  const employeeCode = employee?.employeeCode || '';
  const employeeId = employee?._id || null;

  const newRequest = await LeaveRequest.create({
    employeeId,
    employeeCode,
    employeeName,
    employeeEmail: normalizedEmail,
    requestDate,
    requestType,
    reason: (reason || '').trim(),
    status: 'Pending',
  });

  res.status(201).json({
    success: true,
    data: newRequest,
    message: `${requestType} request submitted successfully.`
  });
});

// 2. Get Current Employee's Leave / OD Requests
const getMyLeaveRequests = asyncHandler(async (req, res) => {
  const normalizedEmail = req.user.email.trim().toLowerCase();

  const requests = await LeaveRequest.find({
    employeeEmail: normalizedEmail
  })
    .sort({ requestDate: -1, createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    data: requests
  });
});

// 3. Get All Leave / OD Requests (Admin Only)
const getAllLeaveRequests = asyncHandler(async (req, res) => {
  const { status, search } = req.query;

  const filter = {};

  if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) {
    filter.status = status;
  }

  if (search && search.trim()) {
    const s = search.trim();
    filter.$or = [
      { employeeName: { $regex: s, $options: 'i' } },
      { employeeEmail: { $regex: s, $options: 'i' } },
      { employeeCode: { $regex: s, $options: 'i' } },
      { reason: { $regex: s, $options: 'i' } },
      { requestType: { $regex: s, $options: 'i' } }
    ];
  }

  const [requests, pendingCount, approvedCount, rejectedCount, totalCount] = await Promise.all([
    LeaveRequest.find(filter).sort({ createdAt: -1 }).lean(),
    LeaveRequest.countDocuments({ status: 'Pending' }),
    LeaveRequest.countDocuments({ status: 'Approved' }),
    LeaveRequest.countDocuments({ status: 'Rejected' }),
    LeaveRequest.countDocuments({})
  ]);

  res.status(200).json({
    success: true,
    data: requests,
    stats: {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      total: totalCount
    }
  });
});

// 4. Review Leave / OD Request - Approve or Reject (Admin Only)
const reviewLeaveRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;

  if (!status || !['Approved', 'Rejected'].includes(status)) {
    throw new AppError('Status decision must be either Approved or Rejected.', 400);
  }

  const request = await LeaveRequest.findById(id);

  if (!request) {
    throw new AppError('Leave request not found.', 404);
  }

  request.status = status;
  request.reviewedBy = req.user.name ? `${req.user.name} (${req.user.email})` : req.user.email;
  request.reviewedAt = new Date();

  if (status === 'Rejected') {
    request.rejectionReason = (rejectionReason || '').trim();
  } else {
    request.rejectionReason = '';
  }

  await request.save();

  res.status(200).json({
    success: true,
    data: request,
    message: `Request ${status.toLowerCase()} successfully.`
  });
});

module.exports = {
  applyLeave,
  getMyLeaveRequests,
  getAllLeaveRequests,
  reviewLeaveRequest
};
