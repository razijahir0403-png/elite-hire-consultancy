const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const moment = require('moment-timezone');

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
  const { month, year } = req.query;

  if (!month || !year) {
    throw new AppError('Month and Year are required', 400);
  }

  const isAdmin = ['admin@elitehire.com', 'dev@elitehire.com'].includes(req.user?.email);
  const requestedEmail = (email || '').trim().toLowerCase();
  const authUserEmail = (req.user?.email || '').trim().toLowerCase();

  // If not admin, regular employees can only query their own attendance history
  if (!isAdmin && requestedEmail !== authUserEmail) {
    throw new AppError('Access denied. You can only view your own attendance history.', 403);
  }

  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  const startDate = moment.tz(`${y}-${m}-01`, 'YYYY-M-DD', 'Asia/Kolkata');
  const daysInMonth = startDate.daysInMonth();
  
  const datesToSearch = [];
  for (let i = 1; i <= daysInMonth; i++) {
    datesToSearch.push(moment.tz(`${y}-${m}-${i}`, 'YYYY-M-D', 'Asia/Kolkata').format('YYYY-MM-DD'));
  }

  // Strictly enforce user's own email if not admin
  const queryEmail = isAdmin ? requestedEmail : authUserEmail;

  const [records, leaveRequests] = await Promise.all([
    Attendance.find({
      employeeEmail: queryEmail,
      loginDate: { $in: datesToSearch }
    }).lean(),
    LeaveRequest.find({
      employeeEmail: queryEmail,
      requestDate: { $in: datesToSearch }
    }).sort({ createdAt: -1 }).lean()
  ]);

  const recordsMap = {};
  records.forEach(r => {
    recordsMap[r.loginDate] = r;
  });

  const leaveMap = {};
  leaveRequests.forEach(l => {
    if (!leaveMap[l.requestDate]) {
      leaveMap[l.requestDate] = l;
    } else {
      const existing = leaveMap[l.requestDate];
      if (l.status === 'Approved') {
        leaveMap[l.requestDate] = l;
      } else if (l.status === 'Pending' && existing.status === 'Rejected') {
        leaveMap[l.requestDate] = l;
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

    const rec = recordsMap[dateStr];
    const leaveReq = leaveMap[dateStr];

    const hasActiveRequest = leaveReq && (leaveReq.status === 'Pending' || leaveReq.status === 'Approved');
    const isEligibleForLeave = isUpcoming && !isWeekend && !hasActiveRequest && !rec;

    if (rec) {
      const daySessions = rec.sessions || [];
      
      generatedHistory.push({
        date: displayDate,
        rawDate: dateStr,
        day: dayName,
        loggedIn: formatTime(daySessions[0] ? daySessions[0].loginTime : null),
        loggedOut: formatTime(rec.lastLogout),
        totalHours: rec.totalWorkingHoursDisplay || '00:00:00',
        workMode: rec.workMode,
        status: rec.status,
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
        } : null
      });
    } else {
      let status = 'Absent';
      if (isWeekend) {
        status = 'Week Off';
      } else if (leaveReq && leaveReq.status === 'Approved') {
        status = leaveReq.requestType; // 'CL', 'SL', or 'OD'
      } else if (isUpcoming) {
        status = '--';
      }

      let totalHoursDisplay = status;
      if (leaveReq && leaveReq.status === 'Approved') {
        totalHoursDisplay = leaveReq.requestType; // 'CL', 'SL', or 'OD'
      }

      generatedHistory.push({
        date: displayDate,
        rawDate: dateStr,
        day: dayName,
        loggedIn: 'N/A',
        loggedOut: 'N/A',
        totalHours: totalHoursDisplay,
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
        } : null
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
