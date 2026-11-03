const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest');
const PermissionRequest = require('../models/PermissionRequest');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const moment = require('moment-timezone');
const { isUserAdmin } = require('../middleware/authMiddleware');

const { formatDigitalClock, updateAttendanceTotals } = require('../utils/attendanceUtils');

// 1. Record Login
const recordLogin = asyncHandler(async (req, res) => {
  const { workMode } = req.body;
  const rawEmail = req.user.email; // From JWT
  const normalizedEmail = rawEmail.trim().toLowerCase();

  console.log(`[Attendance API] Login attempt for email: ${rawEmail}`);

  if (!workMode) {
    throw new AppError('Work mode is required', 400);
  }

  const employees = await Employee.find({ deletedAt: null });
  const employee = employees.find(
    emp => emp.email && emp.email.trim().toLowerCase() === normalizedEmail
  );

  if (!employee) {
    console.log(`[Attendance API] Employee NOT FOUND for email: ${normalizedEmail}`);
    return res.status(200).json({ success: true, message: 'Not an employee, skipping tracking' });
  }

  console.log(`[Attendance API] Employee FOUND: ${employee.employeeName} (${employee.email})`);

  const todayStr = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
  const now = new Date();

  let attendance = await Attendance.findOne({
    employeeEmail: normalizedEmail,
    loginDate: todayStr
  });

  if (!attendance) {
    // Create new attendance record for the day with the first session
    console.log(`[Attendance API] Attendance CREATED for ${normalizedEmail} on ${todayStr}`);
    attendance = await Attendance.create({
      employeeName: employee.employeeName,
      employeeEmail: normalizedEmail,
      loginDate: todayStr,
      workMode,
      status: 'Present',
      sessions: [{
        loginTime: now
      }],
      firstLogin: now,
      lastLogin: now
    });
  } else {
    // Attendance exists, check for active session
    console.log(`[Attendance API] Attendance UPDATED for ${normalizedEmail} on ${todayStr}`);
    const lastSession = attendance.sessions[attendance.sessions.length - 1];
    
    if (lastSession && !lastSession.logoutTime) {
      console.log(`[Attendance API] Active session already exists for ${normalizedEmail}`);
      return res.status(200).json({ success: true, message: 'Already have an active session' });
    }

    // Append a new session
    console.log(`[Attendance API] Session ADDED for ${normalizedEmail}`);
    attendance.sessions.push({
      loginTime: now
    });
    attendance.lastLogin = now;
    await attendance.save();
  }

  res.status(200).json({ success: true, data: attendance });
});

// 2. End Session (Without Complete Logout)
const endSession = asyncHandler(async (req, res) => {
  const normalizedEmail = req.user.email.trim().toLowerCase();
  const todayStr = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');

  const attendance = await Attendance.findOne({
    employeeEmail: normalizedEmail,
    loginDate: todayStr
  });

  if (!attendance || attendance.sessions.length === 0) {
    return res.status(200).json({ success: true, message: 'No active attendance found for today' });
  }

  const lastSession = attendance.sessions[attendance.sessions.length - 1];

  if (lastSession.logoutTime) {
    return res.status(200).json({ success: true, message: 'No active session to end' });
  }

  const now = new Date();
  lastSession.logoutTime = now;
  lastSession.logoutReason = 'End Session';
  lastSession.durationSeconds = Math.floor((now - lastSession.loginTime) / 1000);
  
  attendance.lastLogout = now;
  updateAttendanceTotals(attendance);
  
  await attendance.save();
  console.log(`[Attendance API] Session CLOSED for ${normalizedEmail} with reason: End Session`);
  console.log(`[Attendance API] Total hours calculated for ${normalizedEmail}: ${attendance.totalWorkingHoursDisplay}`);

  res.status(200).json({ success: true, data: attendance });
});

// 3. Complete Logout
const recordLogout = asyncHandler(async (req, res) => {
  const normalizedEmail = req.user.email.trim().toLowerCase();
  const todayStr = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');

  const attendance = await Attendance.findOne({
    employeeEmail: normalizedEmail,
    loginDate: todayStr
  });

  if (!attendance || attendance.sessions.length === 0) {
    return res.status(200).json({ success: true, message: 'No active attendance found for today' });
  }

  const lastSession = attendance.sessions[attendance.sessions.length - 1];

  if (lastSession.logoutTime) {
    // No active session, that's fine, we just return. Or maybe they just wanted to close the page.
    return res.status(200).json({ success: true, message: 'Already logged out' });
  }

  const now = new Date();
  lastSession.logoutTime = now;
  lastSession.logoutReason = 'Logout';
  lastSession.durationSeconds = Math.floor((now - lastSession.loginTime) / 1000);
  
  attendance.lastLogout = now;
  updateAttendanceTotals(attendance);

  await attendance.save();
  console.log(`[Attendance API] Session CLOSED for ${normalizedEmail} with reason: Logout`);
  console.log(`[Attendance API] Total hours calculated for ${normalizedEmail}: ${attendance.totalWorkingHoursDisplay}`);

  res.status(200).json({ success: true, data: attendance });
});

// 4. Get History
const getHistory = asyncHandler(async (req, res) => {
  const { email } = req.params;
  const { month, year } = req.query || {};
  const now = moment().tz('Asia/Kolkata');
  const m = month ? parseInt(month, 10) : (now.month() + 1);
  const y = year ? parseInt(year, 10) : now.year();

  const isAdmin = isUserAdmin(req.user);
  const requestedEmail = (email || '').trim().toLowerCase();
  const authUserEmail = (req.user?.email || '').trim().toLowerCase();

  // If not admin, regular employees can only query their own attendance history
  if (!isAdmin && requestedEmail !== authUserEmail) {
    throw new AppError('Access denied. You can only view your own attendance history.', 403);
  }

  const startDate = moment.tz(`${y}-${m}-01`, 'YYYY-M-DD', 'Asia/Kolkata');
  const daysInMonth = startDate.daysInMonth();
  
  const datesToSearch = [];
  for (let i = 1; i <= daysInMonth; i++) {
    datesToSearch.push(moment.tz(`${y}-${m}-${i}`, 'YYYY-M-D', 'Asia/Kolkata').format('YYYY-MM-DD'));
  }

  // Strictly enforce user's own email if not admin
  const queryEmail = isAdmin ? requestedEmail : authUserEmail;

  const monthKey = `${y}-${String(m).padStart(2, '0')}`;

  const [records, leaveRequests, permissionRequests] = await Promise.all([
    Attendance.find({
      employeeEmail: queryEmail,
      loginDate: { $in: datesToSearch }
    }).lean(),
    LeaveRequest.find({
      employeeEmail: queryEmail,
      $or: [
        { requestDate: { $in: datesToSearch } },
        { datesCovered: { $in: datesToSearch } }
      ]
    }).sort({ createdAt: -1 }).lean(),
    PermissionRequest.find({
      employeeEmail: queryEmail,
      monthKey: monthKey
    }).sort({ permissionDate: 1, createdAt: 1 }).lean()
  ]);

  const recordsMap = {};
  records.forEach(r => {
    recordsMap[r.loginDate] = r;
  });

  const leaveMap = {};
  leaveRequests.forEach(l => {
    const dates = l.datesCovered && l.datesCovered.length > 0 ? l.datesCovered : [l.requestDate];
    dates.forEach(d => {
      if (!leaveMap[d]) {
        leaveMap[d] = l;
      } else {
        const existing = leaveMap[d];
        if (l.status === 'Approved') {
          leaveMap[d] = l;
        } else if (l.status === 'Pending' && existing.status === 'Rejected') {
          leaveMap[d] = l;
        }
      }
    });
  });

  // Calculate chronological approved permission hours against the 6-hour monthly allowance
  let cumulativeApprovedHours = 0;
  const permissionMap = {};
  permissionRequests.forEach((pr) => {
    if (pr.status === 'Approved') {
      const remainingAllowance = Math.max(0, 6 - cumulativeApprovedHours);
      const validCredited = Math.min(pr.totalHours, remainingAllowance);
      cumulativeApprovedHours += pr.totalHours;
      permissionMap[pr.permissionDate] = {
        request: pr,
        validApprovedHours: Math.round(validCredited * 100) / 100,
      };
    } else {
      if (!permissionMap[pr.permissionDate]) {
        permissionMap[pr.permissionDate] = {
          request: pr,
          validApprovedHours: 0,
        };
      }
    }
  });

  const generatedHistory = [];
  const formatTime = (dateObj) => dateObj ? moment(dateObj).tz('Asia/Kolkata').format('hh:mm A') : 'N/A';
  const todayKolkata = moment().tz('Asia/Kolkata').startOf('day');

  for (let i = 1; i <= daysInMonth; i++) {
    const current = moment.tz(`${y}-${m}-${i}`, 'YYYY-M-D', 'Asia/Kolkata');
    const dateStr = current.format('YYYY-MM-DD');
    const displayDate = current.format('DD-MM-YYYY');
    const dayName = current.format('dddd');
    const isWeekend = dayName === 'Saturday' || dayName === 'Sunday';
    const currentDayMoment = current.clone().startOf('day');
    const isUpcoming = currentDayMoment.isSameOrAfter(todayKolkata);
    const isToday = currentDayMoment.isSame(todayKolkata);

    const rec = recordsMap[dateStr];
    const leaveReq = leaveMap[dateStr];
    const permInfo = permissionMap[dateStr];

    const hasActiveRequest = leaveReq && (leaveReq.status === 'Pending' || leaveReq.status === 'Approved');
    const isEligibleForLeave = isUpcoming && !isWeekend && !hasActiveRequest && !rec;

    if (rec) {
      const daySessions = rec.sessions || [];
      const actualWorkingSeconds = rec.totalWorkingSeconds || 0;
      const actualHours = Math.round((actualWorkingSeconds / 3600) * 100) / 100;
      const validPermHours = permInfo ? permInfo.validApprovedHours : 0;
      const creditedHours = Math.round((actualHours + validPermHours) * 100) / 100;
      const hasActiveSession = daySessions.some(s => !s.logoutTime);

      // Business Rule: Credited Hours >= 9 => Present; Credited Hours < 9 => Loss of Pay
      let status = 'Present';
      if (creditedHours >= 9) {
        status = 'Present';
      } else {
        if (!isUpcoming || (isToday && !hasActiveSession)) {
          status = 'Loss of Pay';
        } else if (isToday && hasActiveSession) {
          status = 'Present';
        }
      }

      let totalHoursDisplay = rec.totalWorkingHoursDisplay || '00:00:00';
      if (validPermHours > 0) {
        totalHoursDisplay = `${rec.totalWorkingHoursDisplay} (+${validPermHours}h Perm = ${creditedHours.toFixed(1)}h)`;
      }

      generatedHistory.push({
        date: displayDate,
        rawDate: dateStr,
        day: dayName,
        loggedIn: formatTime(daySessions[0] ? daySessions[0].loginTime : null),
        loggedOut: formatTime(rec.lastLogout),
        totalHours: totalHoursDisplay,
        actualHours,
        validPermHours,
        creditedHours,
        workMode: rec.workMode,
        status: status,
        sessions: daySessions.map(s => ({
          loginTime: formatTime(s.loginTime),
          endTime: formatTime(s.logoutTime),
          type: s.logoutReason || (s.logoutTime ? 'Closed' : 'Active'),
          duration: s.durationSeconds != null ? formatDigitalClock(s.durationSeconds) : 'N/A'
        })),
        isUpcoming,
        isWeekend,
        isEligibleForLeave: false,
        leaveRequest: leaveReq ? {
          id: leaveReq._id,
          type: leaveReq.requestType,
          status: leaveReq.status,
          reason: leaveReq.reason || '',
          submittedAt: leaveReq.createdAt,
          reviewedBy: leaveReq.reviewedBy,
          reviewedAt: leaveReq.reviewedAt,
          rejectionReason: leaveReq.rejectionReason || '',
        } : null,
        permissionRequest: permInfo ? {
          id: permInfo.request._id,
          requestId: permInfo.request.requestId,
          type: permInfo.request.permissionType,
          fromTime: permInfo.request.fromTime,
          toTime: permInfo.request.toTime,
          totalHours: permInfo.request.totalHours,
          validCreditedHours: permInfo.validApprovedHours,
          status: permInfo.request.status,
          reason: permInfo.request.reason || '',
          adminRemarks: permInfo.request.adminRemarks || '',
        } : null,
      });
    } else {
      let status = 'Absent';
      if (isWeekend) {
        status = 'Week Off';
      } else if (leaveReq && leaveReq.status === 'Approved') {
        status = leaveReq.requestType; // 'CL', 'SL', or 'OD'
      } else if (permInfo && permInfo.validApprovedHours >= 9) {
        status = 'Present';
      } else if (isUpcoming) {
        status = '--';
      } else {
        status = 'Loss of Pay';
      }

      let totalHoursDisplay = status;
      if (leaveReq && leaveReq.status === 'Approved') {
        totalHoursDisplay = leaveReq.requestType; // 'CL', 'SL', or 'OD'
      } else if (permInfo && permInfo.validApprovedHours > 0) {
        totalHoursDisplay = `${permInfo.validApprovedHours}h Perm`;
      }

      generatedHistory.push({
        date: displayDate,
        rawDate: dateStr,
        day: dayName,
        loggedIn: 'N/A',
        loggedOut: 'N/A',
        totalHours: totalHoursDisplay,
        actualHours: 0,
        validPermHours: permInfo ? permInfo.validApprovedHours : 0,
        creditedHours: permInfo ? permInfo.validApprovedHours : 0,
        workMode: '--',
        status: status,
        sessions: [],
        isUpcoming,
        isWeekend,
        isEligibleForLeave,
        leaveRequest: leaveReq ? {
          id: leaveReq._id,
          type: leaveReq.requestType,
          status: leaveReq.status,
          reason: leaveReq.reason || '',
          submittedAt: leaveReq.createdAt,
          reviewedBy: leaveReq.reviewedBy,
          reviewedAt: leaveReq.reviewedAt,
          rejectionReason: leaveReq.rejectionReason || '',
        } : null,
        permissionRequest: permInfo ? {
          id: permInfo.request._id,
          requestId: permInfo.request.requestId,
          type: permInfo.request.permissionType,
          fromTime: permInfo.request.fromTime,
          toTime: permInfo.request.toTime,
          totalHours: permInfo.request.totalHours,
          validCreditedHours: permInfo.validApprovedHours,
          status: permInfo.request.status,
          reason: permInfo.request.reason || '',
          adminRemarks: permInfo.request.adminRemarks || '',
        } : null,
      });
    }
  }

  res.status(200).json({ success: true, data: generatedHistory });
});

// 5. Auto Logout Cron
const autoLogoutCron = async () => {
  try {
    const openAttendances = await Attendance.find({
      $or: [
        { 'sessions.logoutTime': null },
        { 'sessions.logoutTime': { $exists: false } }
      ]
    });

    let logoutCount = 0;

    for (const attendance of openAttendances) {
      if (!attendance.sessions || attendance.sessions.length === 0) continue;
      
      const lastSession = attendance.sessions[attendance.sessions.length - 1];
      
      if (!lastSession.logoutTime) {
        const dateStr = attendance.loginDate;
        // Force end the active session at 11:59:59 PM of that loginDate in Asia/Kolkata
        const forcedEndTime = moment.tz(dateStr, 'YYYY-MM-DD', 'Asia/Kolkata').endOf('day').toDate();
        
        lastSession.logoutTime = forcedEndTime;
        lastSession.logoutReason = 'Auto Logout';
        lastSession.durationSeconds = Math.floor((forcedEndTime - lastSession.loginTime) / 1000);
        
        attendance.lastLogout = forcedEndTime;
        updateAttendanceTotals(attendance);
        
        await attendance.save();
        console.log(`[Attendance API] Session CLOSED for ${attendance.employeeEmail} with reason: Auto Logout`);
        console.log(`[Attendance API] Total hours calculated for ${attendance.employeeEmail}: ${attendance.totalWorkingHoursDisplay}`);
        logoutCount++;
      }
    }

    if (logoutCount > 0) {
      console.log(`Auto-logged out ${logoutCount} sessions.`);
    }
  } catch (error) {
    console.error('Error in autoLogoutCron:', error);
  }
};

module.exports = {
  recordLogin,
  endSession,
  recordLogout,
  getHistory,
  autoLogoutCron
};
