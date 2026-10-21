const PermissionRequest = require('../models/PermissionRequest');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const moment = require('moment-timezone');

const MONTHLY_PERMISSION_LIMIT_HOURS = 6;

// Per-employee in-memory mutex to prevent concurrent duplicate submissions and approvals
const userLocks = new Map();

const runWithUserLock = async (userKey, fn) => {
  const currentPromise = userLocks.get(userKey) || Promise.resolve();
  let release;
  const nextPromise = new Promise((resolve) => {
    release = resolve;
  });
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

/**
 * Helper to calculate start & end moments, total duration in minutes & hours
 * Supports midnight crossing if toTime <= fromTime
 */
const calculatePermissionDuration = (permissionDate, fromTime, toTime) => {
  const startMoment = moment.tz(`${permissionDate} ${fromTime}`, 'YYYY-MM-DD HH:mm', 'Asia/Kolkata');
  let endMoment = moment.tz(`${permissionDate} ${toTime}`, 'YYYY-MM-DD HH:mm', 'Asia/Kolkata');

  if (!startMoment.isValid() || !endMoment.isValid()) {
    throw new AppError('Invalid time format. Please provide valid From and To times (HH:mm).', 400);
  }

  // Handle midnight crossing if toTime <= fromTime
  if (endMoment.isSameOrBefore(startMoment)) {
    endMoment = endMoment.add(1, 'day');
  }

  const totalMinutes = endMoment.diff(startMoment, 'minutes');
  if (totalMinutes <= 0) {
    throw new AppError('To Time must be later than From Time.', 400);
  }

  // Decimal hours rounded to 2 decimal places
  const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

  return {
    startMoment,
    endMoment,
    totalMinutes,
    totalHours,
  };
};

/**
 * 1. Submit Permission Request (Authenticated Employee)
 */
const applyPermission = asyncHandler(async (req, res) => {
  const { permissionDate, fromTime, toTime, permissionType, reason } = req.body;

  if (!req.user || !req.user.email) {
    throw new AppError('Authentication required.', 401);
  }

  const normalizedEmail = req.user.email.trim().toLowerCase();

  await runWithUserLock(normalizedEmail, async () => {
    if (!permissionDate || !/^\d{4}-\d{2}-\d{2}$/.test(permissionDate)) {
      throw new AppError('Valid permission date is required (YYYY-MM-DD format).', 400);
    }

    if (!fromTime || !toTime) {
      throw new AppError('Both From Time and To Time are required.', 400);
    }

    if (!reason || !reason.trim()) {
      throw new AppError('Reason is required.', 400);
    }

    const { startMoment, endMoment, totalMinutes, totalHours } = calculatePermissionDuration(
      permissionDate,
      fromTime,
      toTime
    );

    if (totalHours > MONTHLY_PERMISSION_LIMIT_HOURS) {
      throw new AppError(
        `A single permission request cannot exceed the monthly limit of ${MONTHLY_PERMISSION_LIMIT_HOURS} hours.`,
        400
      );
    }

    const monthKey = permissionDate.slice(0, 7); // YYYY-MM
    const monthName = moment(monthKey, 'YYYY-MM').format('MMMM YYYY');

    // Query active (Pending or Approved) requests for this employee in this calendar month
    const activeRequestsThisMonth = await PermissionRequest.find({
      employeeEmail: normalizedEmail,
      monthKey,
      status: { $in: ['Pending', 'Approved'] },
    }).lean();

    // 1. Check for overlapping permission requests on the same day
    const sameDayRequests = activeRequestsThisMonth.filter((r) => r.permissionDate === permissionDate);
    for (const ex of sameDayRequests) {
      const { startMoment: exStart, endMoment: exEnd } = calculatePermissionDuration(
        ex.permissionDate,
        ex.fromTime,
        ex.toTime
      );

      // Check overlap
      if (startMoment.isBefore(exEnd) && endMoment.isAfter(exStart)) {
        throw new AppError(
          `Overlapping permission request detected. You already have a ${ex.status.toLowerCase()} permission from ${ex.fromTime} to ${ex.toTime} on ${permissionDate}.`,
          400
        );
      }
    }

    // 2. Calculate monthly allowance usage
    const approvedHoursUsed = activeRequestsThisMonth
      .filter((r) => r.status === 'Approved')
      .reduce((sum, r) => sum + r.totalHours, 0);

    const pendingHours = activeRequestsThisMonth
      .filter((r) => r.status === 'Pending')
      .reduce((sum, r) => sum + r.totalHours, 0);

    const totalCommittedHours = approvedHoursUsed + pendingHours;
    const availableHoursToRequest = Math.max(0, MONTHLY_PERMISSION_LIMIT_HOURS - totalCommittedHours);

    if (totalCommittedHours + totalHours > MONTHLY_PERMISSION_LIMIT_HOURS) {
      throw new AppError(
        `Request exceeds the monthly limit of ${MONTHLY_PERMISSION_LIMIT_HOURS} permission hours for ${monthName}. ` +
          `You have ${approvedHoursUsed} approved hours and ${pendingHours} pending hours. ` +
          `Remaining available allowance: ${availableHoursToRequest.toFixed(2)} hours. ` +
          `Your requested duration is ${totalHours} hours.`,
        400
      );
    }

    // Lookup Employee profile
    const employee = await Employee.findOne({
      email: normalizedEmail,
      deletedAt: null,
    }).lean();

    const employeeName = employee?.employeeName || req.user.name || 'Employee';
    const employeeCode = employee?.employeeCode || '';
    const employeeId = employee?._id || null;

    // Generate unique human-readable Request ID
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const requestId = `PR-${Date.now().toString().slice(-6)}${randomSuffix}`;

    const newRequest = await PermissionRequest.create({
      requestId,
      employeeId,
      employeeCode,
      employeeName,
      employeeEmail: normalizedEmail,
      permissionDate,
      permissionType: permissionType || 'Personal Work',
      fromTime,
      toTime,
      totalMinutes,
      totalHours,
      monthKey,
      reason: reason.trim(),
      status: 'Pending',
    });

    res.status(201).json({
      success: true,
      data: newRequest,
      message: 'Permission request submitted successfully.',
    });
  });
});

/**
 * 2. Get Current Employee's Permission Requests and Monthly Allowance
 */
const getMyPermissionRequests = asyncHandler(async (req, res) => {
  const normalizedEmail = req.user.email.trim().toLowerCase();
  const { month, year } = req.query;

  // Use current month/year if not provided
  const now = moment().tz('Asia/Kolkata');
  const targetYear = year ? parseInt(year, 10) : now.year();
  const targetMonth = month ? parseInt(month, 10) : now.month() + 1;
  const monthKey = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

  const allRequests = await PermissionRequest.find({
    employeeEmail: normalizedEmail,
  })
    .sort({ permissionDate: -1, createdAt: -1 })
    .lean();

  const totalCount = allRequests.length;
  const pendingCount = allRequests.filter((r) => r.status === 'Pending').length;
  const approvedCount = allRequests.filter((r) => r.status === 'Approved').length;
  const rejectedCount = allRequests.filter((r) => r.status === 'Rejected').length;

  // Filter requests for the relevant calendar month to compute limit
  const monthRequests = allRequests.filter((r) => r.monthKey === monthKey);

  const approvedHoursUsed = monthRequests
    .filter((r) => r.status === 'Approved')
    .reduce((sum, r) => sum + r.totalHours, 0);

  const pendingHours = monthRequests
    .filter((r) => r.status === 'Pending')
    .reduce((sum, r) => sum + r.totalHours, 0);

  const remainingHours = Math.max(0, MONTHLY_PERMISSION_LIMIT_HOURS - approvedHoursUsed);
  const remainingAvailable = Math.max(0, MONTHLY_PERMISSION_LIMIT_HOURS - approvedHoursUsed - pendingHours);

  res.status(200).json({
    success: true,
    data: allRequests,
    stats: {
      total: totalCount,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
    },
    monthlyAllowance: {
      limitHours: MONTHLY_PERMISSION_LIMIT_HOURS,
      monthKey,
      approvedHoursUsed: Math.round(approvedHoursUsed * 100) / 100,
      pendingHours: Math.round(pendingHours * 100) / 100,
      remainingHours: Math.round(remainingHours * 100) / 100,
      remainingAvailable: Math.round(remainingAvailable * 100) / 100,
    },
  });
});

/**
 * 3. Get All Permission Requests (Admin Only)
 */
const getAllPermissionRequests = asyncHandler(async (req, res) => {
  const { status, search, date, month, year, employeeEmail } = req.query;

  const filter = {};

  if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) {
    filter.status = status;
  }

  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    filter.permissionDate = date;
  }

  if (month && year) {
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    filter.monthKey = monthKey;
  }

  if (employeeEmail && employeeEmail.trim()) {
    filter.employeeEmail = employeeEmail.trim().toLowerCase();
  }

  if (search && search.trim()) {
    const s = search.trim();
    filter.$or = [
      { employeeName: { $regex: s, $options: 'i' } },
      { employeeEmail: { $regex: s, $options: 'i' } },
      { employeeCode: { $regex: s, $options: 'i' } },
      { requestId: { $regex: s, $options: 'i' } },
      { reason: { $regex: s, $options: 'i' } },
      { permissionType: { $regex: s, $options: 'i' } },
      { permissionDate: { $regex: s, $options: 'i' } },
    ];
  }

  const [requests, pendingCount, approvedCount, rejectedCount, totalCount] = await Promise.all([
    PermissionRequest.find(filter).sort({ permissionDate: -1, createdAt: -1 }).lean(),
    PermissionRequest.countDocuments({ status: 'Pending' }),
    PermissionRequest.countDocuments({ status: 'Approved' }),
    PermissionRequest.countDocuments({ status: 'Rejected' }),
    PermissionRequest.countDocuments({}),
  ]);

  res.status(200).json({
    success: true,
    data: requests,
    stats: {
      total: totalCount,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
    },
  });
});

/**
 * 4. Review Permission Request - Approve or Reject (Admin Only)
 */
const reviewPermissionRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, adminRemarks } = req.body;

  if (!status || !['Approved', 'Rejected'].includes(status)) {
    throw new AppError('Status decision must be either Approved or Rejected.', 400);
  }

  const request = await PermissionRequest.findById(id);
  if (!request) {
    throw new AppError('Permission request not found.', 404);
  }

  const normalizedEmail = request.employeeEmail.toLowerCase();

  await runWithUserLock(normalizedEmail, async () => {
    // If request has already been decided, prevent duplicate decision unless needed
    if (request.status !== 'Pending' && request.status === status) {
      return res.status(200).json({
        success: true,
        data: request,
        message: `Request is already ${status.toLowerCase()}.`,
      });
    }

    if (status === 'Approved') {
      // Revalidate that approving this request will not cause the employee to exceed 6 approved hours in that month
      const otherApprovedRequests = await PermissionRequest.find({
        employeeEmail: normalizedEmail,
        monthKey: request.monthKey,
        status: 'Approved',
        _id: { $ne: request._id },
      }).lean();

      const currentlyApprovedHours = otherApprovedRequests.reduce((sum, r) => sum + r.totalHours, 0);

      if (currentlyApprovedHours + request.totalHours > MONTHLY_PERMISSION_LIMIT_HOURS) {
        throw new AppError(
          `Cannot approve request. Approving this ${request.totalHours}-hour permission would exceed the 6-hour monthly limit ` +
            `(${currentlyApprovedHours} hours already approved for ${request.monthKey}).`,
          400
        );
      }
    }

    request.status = status;
    request.adminRemarks = (adminRemarks || '').trim();
    request.reviewedBy = req.user.name ? `${req.user.name} (${req.user.email})` : req.user.email;
    request.reviewedByUserId = req.user._id;
    request.decidedAt = new Date();

    await request.save();

    // Sync corresponding Attendance record if exists
    const attendance = await Attendance.findOne({
      employeeEmail: normalizedEmail,
      loginDate: request.permissionDate,
    });

    if (attendance) {
      const actualWorkingSeconds = attendance.totalWorkingSeconds || 0;
      const actualHours = actualWorkingSeconds / 3600;

      if (status === 'Approved') {
        const creditedHours = actualHours + request.totalHours;
        if (creditedHours >= 9) {
          attendance.status = 'Present';
        } else {
          attendance.status = 'Loss of Pay';
        }
      } else {
        // If rejected, check actual hours alone
        if (actualHours >= 9) {
          attendance.status = 'Present';
        } else {
          attendance.status = 'Loss of Pay';
        }
      }
      await attendance.save();
    }

    res.status(200).json({
      success: true,
      data: request,
      message: `Permission request ${status.toLowerCase()} successfully.`,
    });
  });
});

module.exports = {
  applyPermission,
  getMyPermissionRequests,
  getAllPermissionRequests,
  reviewPermissionRequest,
  MONTHLY_PERMISSION_LIMIT_HOURS,
};
