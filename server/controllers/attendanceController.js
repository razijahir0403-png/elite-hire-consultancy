const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
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

  const todayStr = moment().utcOffset(330).format('YYYY-MM-DD'); // Assuming IST based on timezone metadata, but wait, the prompt says "Store timestamps in UTC. Display in local timezone." We'll just use moment() which uses server local, or moment.utc() for storing. We'll use moment().format('YYYY-MM-DD') for local date boundaries.

  const now = new Date(); // Stores in UTC natively in MongoDB

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
      sessionStatus: 'Active',
      sessions: [
        {
          loginTime: now,
          endTime: null,
          type: 'Active'
        }
      ]
    });
  } else {
    // If it exists, append a new session (unless it's already logged out)
    // We shouldn't create a new session if the last one is still Active
    const lastSession = attendance.sessions[attendance.sessions.length - 1];
    if (lastSession && lastSession.type === 'Active') {
      return res.status(200).json({ success: true, message: 'Already have an active session' });
    }

    if (attendance.sessionStatus === 'Logged Out' || attendance.sessionStatus === 'Auto Logged Out') {
      return res.status(200).json({ success: true, message: 'Already logged out completely today' });
    }

    attendance.sessions.push({
      loginTime: now,
      endTime: null,
      type: 'Active'
    });
    attendance.sessionStatus = 'Active';
    await attendance.save();
  }

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

  const lastSession = attendance.sessions[attendance.sessions.length - 1];
  if (!lastSession || lastSession.type !== 'Active') {
    return res.status(200).json({ success: true, message: 'No active session to end' });
  }

  const now = new Date();
  lastSession.endTime = now;
  lastSession.type = 'End Session';
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
  
  const lastSession = attendance.sessions[attendance.sessions.length - 1];
  if (lastSession && lastSession.type === 'Active') {
    lastSession.endTime = now;
    lastSession.type = 'Logout';
  } else {
    // If they were in 'Ended' state and clicked Logout
    attendance.sessions.push({
      loginTime: lastSession ? lastSession.endTime : now,
      endTime: now,
      type: 'Logout'
    });
  }

  attendance.logoutTime = now;
  attendance.sessionStatus = 'Logged Out';
  attendance.totalHours = formatTotalHours(now - attendance.firstLoginTime);

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
  
  // Get all days in the requested month
  const startDate = moment(`${y}-${m}-01`, 'YYYY-M-DD');
  const daysInMonth = startDate.daysInMonth();
  
  const records = await Attendance.find({
    employeeEmail: email,
    loginDate: {
      $regex: `^${y}-${m.toString().padStart(2, '0')}` // match YYYY-MM
    }
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
      generatedHistory.push({
        date: displayDate,
        day: dayName,
        loggedIn: formatTime(rec.firstLoginTime),
        loggedOut: formatTime(rec.logoutTime),
        totalHours: rec.totalHours || 'N/A',
        workMode: rec.workMode,
        status: rec.status,
        sessions: rec.sessions.map(s => ({
          loginTime: formatTime(s.loginTime),
          endTime: formatTime(s.endTime),
          type: s.type
        }))
      });
    } else {
      let status = 'Absent';
      if (isWeekend) status = 'Week Off';
      if (current.isAfter(moment(), 'day')) {
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
    const todayStr = moment().format('YYYY-MM-DD'); // Actually, if this runs at 11:59:59, todayStr is correct. If it runs at 00:00:00, todayStr is the next day, so we need yesterday. We'll check all unresolved records.
    
    // Find all attendance records where logoutTime is null
    const openAttendances = await Attendance.find({ logoutTime: null });
    
    for (const attendance of openAttendances) {
      const lastSession = attendance.sessions[attendance.sessions.length - 1];
      let forcedEndTime;

      if (lastSession && lastSession.type === 'Active') {
        // Force end the active session at 11:59:59 PM of that loginDate
        forcedEndTime = moment(attendance.loginDate, 'YYYY-MM-DD').endOf('day').toDate();
        lastSession.endTime = forcedEndTime;
        lastSession.type = 'Auto Logout';
      } else if (lastSession && lastSession.type === 'End Session') {
        // Use the last session's end time
        forcedEndTime = lastSession.endTime;
        // Append an Auto Logout marker session for clarity (optional, but good for history)
        attendance.sessions.push({
          loginTime: forcedEndTime,
          endTime: forcedEndTime,
          type: 'Auto Logout'
        });
      } else {
         continue; // Something weird, just skip
      }

      attendance.logoutTime = forcedEndTime;
      attendance.sessionStatus = 'Auto Logged Out';
      attendance.totalHours = formatTotalHours(forcedEndTime - attendance.firstLoginTime);
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
