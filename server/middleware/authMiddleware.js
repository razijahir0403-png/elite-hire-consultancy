const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const moment = require('moment-timezone');
const Attendance = require('../models/Attendance');
const { updateAttendanceTotals } = require('../utils/attendanceUtils');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Session expired. Please log in again.', 401);
      }
      if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
        throw new AppError('Invalid token. Please log in again.', 401);
      }
      throw error;
    }

    const user = await User.findById(decoded.id).select('-password').populate('role', 'name permissions');

    if (!user) {
      throw new AppError('User not found in system', 401);
    }

    // --- DAILY LOGIN CHECK ---
    const tokenMoment = moment.unix(decoded.iat).tz('Asia/Kolkata');
    const todayMoment = moment().tz('Asia/Kolkata');

    if (tokenMoment.isBefore(todayMoment, 'day')) {
      const normalizedEmail = user.email.trim().toLowerCase();
      const tokenDateStr = tokenMoment.format('YYYY-MM-DD');

      // Lazy closure of previous day's session
      const attendance = await Attendance.findOne({ employeeEmail: normalizedEmail, loginDate: tokenDateStr });
      if (attendance && attendance.sessions && attendance.sessions.length > 0) {
        const lastSession = attendance.sessions[attendance.sessions.length - 1];
        if (!lastSession.logoutTime) {
          const forcedEndTime = moment.tz(tokenDateStr, 'YYYY-MM-DD', 'Asia/Kolkata').endOf('day').toDate();
          lastSession.logoutTime = forcedEndTime;
          lastSession.logoutReason = 'Auto Logout';
          lastSession.durationSeconds = Math.floor((forcedEndTime - lastSession.loginTime) / 1000);
          attendance.lastLogout = forcedEndTime;
          updateAttendanceTotals(attendance);
          await attendance.save();
          console.log(`[Auth Middleware] Lazy auto-closed session for ${normalizedEmail} on ${tokenDateStr}`);
        }
      }

      throw new AppError('Daily login required. Your session from a previous day has expired. Please log in again.', 401);
    }
    // -------------------------

    req.user = user;
    return next();
  }

  throw new AppError('Not authorized, no token provided', 401);
});

const adminOnly = (req, res, next) => {
  if (!['admin@elitehire.com', 'dev@elitehire.com'].includes(req.user?.email)) {
    return next(new AppError('Access denied. Administrator privileges required.', 403));
  }
  next();
};

module.exports = { protect, adminOnly };
