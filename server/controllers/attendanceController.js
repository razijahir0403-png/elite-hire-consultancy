const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const SessionHistory = require('../models/SessionHistory');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const moment = require('moment');

// Utility to format total hours
const formatTotalHours = (ms) => {
  if (ms < 0) return '00 Hrs 00 Mins';
  const totalMins = Math.floor(ms / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hours.toString().padStart(2, '0')} Hrs ${mins.toString().padStart(2, '0')} Mins`;
};

// Calculate total hours for a day
const calculateTotalHours = async (email, todayStr) => {
  const sessions = await SessionHistory.find({ employeeEmail: email, loginDate: todayStr }).lean();
  const totalMs = sessions.reduce((acc, sess) => acc + (sess.sessionDuration || 0), 0);
  return formatTotalHours(totalMs);
};

// 1. Record Login
const recordLogin = asyncHandler(async (req, res) => {
  const { workMode } = req.body;
  const email = req.user.email; // From JWT

  if (!workMode) {
    throw new AppError('Work mode is required', 400);
  }

  // Find corresponding employee record
  const employee = await Employee.findOne({ email, deletedAt: null });
  if (!employee) {
    return res.status(200).json({ success: true, message: 'Not an employee, skipping tracking' });
  }

  const todayStr = moment().utcOffset(330).format('YYYY-MM-DD');
  const now = new Date();

  let attendance = await Attendance.findOne({
    employeeEmail: email,
    loginDate: todayStr
  });

  if (!attendance) {
    // Create new attendance record
    attendance = await Attendance.create({
      employeeName: employee.employeeName,
      employeeEmail: email,
      loginDate: todayStr,
      firstLoginTime: now,
      workMode,
      status: 'Present',
      sessionStatus: 'Active'
    });
  } else {
    if (attendance.sessionStatus === 'Logged Out' || attendance.sessionStatus === 'Auto Logged Out') {
      return res.status(200).json({ success: true, message: 'Already logged out completely today' });
    }
  }

  // Check if already active
  const activeSession = await SessionHistory.findOne({
    employeeEmail: email,
    loginDate: todayStr,
    type: 'Active'
  });

  if (activeSession) {
    return res.status(200).json({ success: true, message: 'Already have an active session' });
  }

  await SessionHistory.create({
    employeeEmail: email,
    loginDate: todayStr,
    loginTime: now,
    type: 'Active'
  });

  attendance.sessionStatus = 'Active';
  await attendance.save();

  res.status(200).json({ success: true, data: attendance });
});

// 2. End Session (Without Complete Logout)
const endSession = asyncHandler(async (req, res) => {
  const email = req.user.email;
  const todayStr = moment().format('YYYY-MM-DD');

  const attendance = await Attendance.findOne({
    employeeEmail: email,
    loginDate: todayStr
  });

  if (!attendance) {
    return res.status(200).json({ success: true, message: 'No active attendance found for today' });
  }

  const activeSession = await SessionHistory.findOne({
    employeeEmail: email,
    loginDate: todayStr,
    type: 'Active'
  });

  if (!activeSession) {
    return res.status(200).json({ success: true, message: 'No active session to end' });
  }

  const now = new Date();
  activeSession.endTime = now;
  activeSession.type = 'End Session';
  activeSession.sessionDuration = now - activeSession.loginTime;
  await activeSession.save();

  attendance.sessionStatus = 'Ended';
  await attendance.save();

  res.status(200).json({ success: true, data: attendance });
});

// 3. Complete Logout
const recordLogout = asyncHandler(async (req, res) => {
  const email = req.user.email;
  const todayStr = moment().format('YYYY-MM-DD');

  const attendance = await Attendance.findOne({
    employeeEmail: email,
    loginDate: todayStr
  });

  if (!attendance) {
    return res.status(200).json({ success: true, message: 'No active attendance found for today' });
  }

  const now = new Date();

  // Close any active session
  const activeSession = await SessionHistory.findOne({
    employeeEmail: email,
    loginDate: todayStr,
    type: 'Active'
  });

  if (activeSession) {
    activeSession.endTime = now;
    activeSession.type = 'Logout';
    activeSession.sessionDuration = now - activeSession.loginTime;
    await activeSession.save();
  }

  // Update attendance
  attendance.logoutTime = now;
  attendance.sessionStatus = 'Logged Out';
  attendance.totalHours = await calculateTotalHours(email, todayStr);

  await attendance.save();

  res.status(200).json({ success: true, data: attendance });
});

// 4. Get History
const getHistory = asyncHandler(async (req, res) => {
  const { email } = req.params;
  const { month, year } = req.query;

  if (!month || !year) {
    throw new AppError('Month and Year are required', 400);
  }

  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  const startDate = moment(`${y}-${m}-01`, 'YYYY-M-DD');
  const daysInMonth = startDate.daysInMonth();
  
  const datesToSearch = [];
  for (let i = 1; i <= daysInMonth; i++) {
    datesToSearch.push(moment(`${y}-${m}-${i}`, 'YYYY-M-D').format('YYYY-MM-DD'));
  }

  const queryEmail = email.toLowerCase();

  const records = await Attendance.find({
    employeeEmail: queryEmail,
    loginDate: { $in: datesToSearch }
  }).lean();

  // Fetch sessions for this month and employee
  const sessionsList = await SessionHistory.find({
    employeeEmail: queryEmail,
    loginDate: { $in: datesToSearch }
  }).sort({ loginTime: 1 }).lean();

  const sessionsMap = {};
  sessionsList.forEach(s => {
    if (!sessionsMap[s.loginDate]) sessionsMap[s.loginDate] = [];
    sessionsMap[s.loginDate].push(s);
  });

  const recordsMap = {};
  records.forEach(r => {
    recordsMap[r.loginDate] = r;
  });

  const generatedHistory = [];
  const formatTime = (dateObj) => dateObj ? moment(dateObj).format('hh:mm A') : 'N/A';

  for (let i = 1; i <= daysInMonth; i++) {
    const current = moment(`${y}-${m}-${i}`, 'YYYY-M-D');
    const dateStr = current.format('YYYY-MM-DD');
    const displayDate = current.format('DD-MM-YYYY');
    const dayName = current.format('dddd');
    const isWeekend = dayName === 'Saturday' || dayName === 'Sunday';

    if (recordsMap[dateStr]) {
      const rec = recordsMap[dateStr];
      const daySessions = sessionsMap[dateStr] || [];
      generatedHistory.push({
        date: displayDate,
        day: dayName,
        loggedIn: formatTime(rec.firstLoginTime),
        loggedOut: formatTime(rec.logoutTime),
        totalHours: rec.totalHours || 'N/A',
        workMode: rec.workMode,
        status: rec.status,
        sessions: daySessions.map(s => ({
          loginTime: formatTime(s.loginTime),
          endTime: formatTime(s.endTime),
          type: s.type,
          duration: s.sessionDuration ? formatTotalHours(s.sessionDuration) : 'N/A'
        }))
      });
    } else {
      let status = 'Absent';
      if (isWeekend) status = 'Week Off';
      // If it's a future date
      if (current.isSame(moment(), 'day') || current.isAfter(moment(), 'day')) {
        status = '--';
      }

      generatedHistory.push({
        date: displayDate,
        day: dayName,
        loggedIn: 'N/A',
        loggedOut: 'N/A',
        totalHours: status,
        workMode: '--',
        status: status,
        sessions: []
      });
    }
  }

  res.status(200).json({ success: true, data: generatedHistory });
});

// 5. Auto Logout Cron
const autoLogoutCron = async () => {
  try {
    const openAttendances = await Attendance.find({ logoutTime: null });

    for (const attendance of openAttendances) {
      const dateStr = attendance.loginDate;
      const lastSession = await SessionHistory.findOne({
        employeeEmail: attendance.employeeEmail,
        loginDate: dateStr
      }).sort({ loginTime: -1 });

      let forcedEndTime;

      if (lastSession && lastSession.type === 'Active') {
        // Force end the active session at 11:59:59 PM of that loginDate
        forcedEndTime = moment(dateStr, 'YYYY-MM-DD').endOf('day').toDate();
        lastSession.endTime = forcedEndTime;
        lastSession.type = 'Auto Logout';
        lastSession.sessionDuration = forcedEndTime - lastSession.loginTime;
        await lastSession.save();
      } else if (lastSession && lastSession.type === 'End Session') {
        forcedEndTime = lastSession.endTime;
        // The last session already has a duration, no need to update it
      } else {
        continue;
      }

      attendance.logoutTime = forcedEndTime;
      attendance.sessionStatus = 'Auto Logged Out';
      attendance.totalHours = await calculateTotalHours(attendance.employeeEmail, dateStr);
      await attendance.save();
    }

    if (openAttendances.length > 0) {
      console.log(`Auto-logged out ${openAttendances.length} sessions.`);
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
