const LeaveRequest = require('../models/LeaveRequest');
const Employee = require('../models/Employee');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const moment = require('moment-timezone');

// Map of email -> Promise chain for serializing concurrent requests per user
const userLocks = new Map();

const runWithUserLock = async (userKey, fn) => {
  const currentPromise = userLocks.get(userKey) || Promise.resolve();
  let release;
  const nextPromise = new Promise(resolve => { release = resolve; });
  userLocks.set(userKey, currentPromise.then(() => nextPromise));

  await currentPromise;
  try {
    return await fn();
  } finally {
    release();
    if (userLocks.get(userKey) === nextPromise) {
      userLocks.delete(userKey);
    }
  }
};

// 1. Submit Leave / OD Request (Authenticated Employee)
const applyLeave = asyncHandler(async (req, res) => {
  const { requestDate, endDate, requestType, reason } = req.body;

  if (!req.user || !req.user.email) {
    throw new AppError('Authentication required.', 401);
  }

  const normalizedEmail = req.user.email.trim().toLowerCase();

  // Protect against concurrent submissions for the same employee
  await runWithUserLock(normalizedEmail, async () => {
    if (!requestType || !['CL', 'SL', 'OD'].includes(requestType)) {
      throw new AppError('Invalid request type. Must be CL (Casual Leave), SL (Sick Leave), or OD (On Duty).', 400);
    }

    if (!requestDate || !/^\d{4}-\d{2}-\d{2}$/.test(requestDate)) {
      throw new AppError('Valid start date is required (YYYY-MM-DD format).', 400);
    }

    const effectiveEndDate = (endDate && String(endDate).trim()) ? String(endDate).trim() : requestDate;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveEndDate)) {
      throw new AppError('Valid end date is required (YYYY-MM-DD format).', 400);
    }

    // Validate dates in Asia/Kolkata timezone
    const todayKolkata = moment().tz('Asia/Kolkata').startOf('day');
    const startMoment = moment.tz(requestDate, 'YYYY-MM-DD', 'Asia/Kolkata').startOf('day');
    const endMoment = moment.tz(effectiveEndDate, 'YYYY-MM-DD', 'Asia/Kolkata').startOf('day');

    if (!startMoment.isValid() || !endMoment.isValid()) {
      throw new AppError('Invalid date provided.', 400);
    }

    if (endMoment.isBefore(startMoment)) {
      throw new AppError('End date cannot be earlier than start date.', 400);
    }

    // Must be upcoming date (today or future in Asia/Kolkata)
    if (startMoment.isBefore(todayKolkata)) {
      throw new AppError('Cannot apply leave/OD for past dates.', 400);
    }

    // Collect all working days in range (excluding Saturday 6 and Sunday 0)
    const datesCovered = [];
    const curr = startMoment.clone();
    while (curr.isSameOrBefore(endMoment)) {
      const dayOfWeek = curr.day();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        datesCovered.push(curr.format('YYYY-MM-DD'));
      }
      curr.add(1, 'day');
    }

    if (datesCovered.length === 0) {
      if (startMoment.isSame(endMoment)) {
        throw new AppError('Leave/OD cannot be applied for weekends (Saturday or Sunday) as they are Week Offs.', 400);
      } else {
        throw new AppError('The selected date range contains only weekends. Leave/OD is not required on Week Offs.', 400);
      }
    }

    const monthsCovered = [...new Set(datesCovered.map(d => d.slice(0, 7)))];

    // Query all active (Pending or Approved) requests for this employee
    const existingActive = await LeaveRequest.find({
      employeeEmail: normalizedEmail,
      status: { $in: ['Pending', 'Approved'] }
    }).lean();

    // 1) Prevent date overlap with any existing active request
    for (const existing of existingActive) {
      const existingDates = existing.datesCovered && existing.datesCovered.length > 0
        ? existing.datesCovered
        : [existing.requestDate];

      const overlappingDates = datesCovered.filter(d => existingDates.includes(d));
      if (overlappingDates.length > 0) {
        const firstOverlap = moment(overlappingDates[0], 'YYYY-MM-DD').format('DD-MM-YYYY');
        throw new AppError(
          `A ${existing.requestType} request is already ${existing.status.toLowerCase()} for date ${firstOverlap}.`,
          400
        );
      }
    }

    // 2) Enforce Monthly CL Limits: Maximum 1 CL per calendar month
    if (requestType === 'CL') {
      for (const m of monthsCovered) {
        const monthName = moment(m, 'YYYY-MM').format('MMMM YYYY');
        const daysInMonth = datesCovered.filter(d => d.startsWith(m)).length;

        if (daysInMonth > 1) {
          throw new AppError(
            `Casual Leave (CL) is limited to a maximum of 1 day per calendar month. Your request includes ${daysInMonth} days in ${monthName}.`,
            400
          );
        }

        // Check if an active CL already exists in month m
        const hasExistingCl = existingActive.some(r => {
          if (r.requestType !== 'CL') return false;
          const rMonths = r.monthsCovered && r.monthsCovered.length > 0
            ? r.monthsCovered
            : [(r.requestDate || '').slice(0, 7)];
          return rMonths.includes(m);
        });

        if (hasExistingCl) {
          throw new AppError(
            `Monthly limit reached: You already have a pending or approved Casual Leave (CL) request for ${monthName}. Only 1 CL per calendar month is allowed.`,
            400
          );
        }
      }
    }

    // 3) Enforce Monthly SL Limits: Maximum 1 SL per calendar month
    if (requestType === 'SL') {
      for (const m of monthsCovered) {
        const monthName = moment(m, 'YYYY-MM').format('MMMM YYYY');
        const daysInMonth = datesCovered.filter(d => d.startsWith(m)).length;

        if (daysInMonth > 1) {
          throw new AppError(
            `Sick Leave (SL) is limited to a maximum of 1 day per calendar month. Your request includes ${daysInMonth} days in ${monthName}.`,
            400
          );
        }

        // Check if an active SL already exists in month m
        const hasExistingSl = existingActive.some(r => {
          if (r.requestType !== 'SL') return false;
          const rMonths = r.monthsCovered && r.monthsCovered.length > 0
            ? r.monthsCovered
            : [(r.requestDate || '').slice(0, 7)];
          return rMonths.includes(m);
        });

        if (hasExistingSl) {
          throw new AppError(
            `Monthly limit reached: You already have a pending or approved Sick Leave (SL) request for ${monthName}. Only 1 SL per calendar month is allowed.`,
            400
          );
        }
      }
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
      endDate: effectiveEndDate,
      datesCovered,
      monthsCovered,
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
});

// 2. Get Current Employee's Leave / OD Requests
const getMyLeaveRequests = asyncHandler(async (req, res) => {
  const normalizedEmail = req.user.email.trim().toLowerCase();

  const requests = await LeaveRequest.find({
    employeeEmail: normalizedEmail
  })
    .sort({ requestDate: -1, createdAt: -1 })
    .lean();

  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const approvedCount = requests.filter(r => r.status === 'Approved').length;
  const rejectedCount = requests.filter(r => r.status === 'Rejected').length;
  const totalCount = requests.length;

  res.status(200).json({
    success: true,
    data: requests,
    stats: {
      total: totalCount,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount
    }
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
