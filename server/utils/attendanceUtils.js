// Format total seconds into HH:MM:SS
const formatDigitalClock = (totalSeconds) => {
  if (totalSeconds < 0) totalSeconds = 0;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// Recalculate totals directly from embedded array
const updateAttendanceTotals = (attendance) => {
  let totalSeconds = 0;
  if (attendance.sessions) {
    attendance.sessions.forEach(sess => {
      if (sess.durationSeconds) {
        totalSeconds += sess.durationSeconds;
      }
    });
  }
  attendance.totalWorkingSeconds = totalSeconds;
  attendance.totalWorkingHoursDisplay = formatDigitalClock(totalSeconds);
};

module.exports = {
  formatDigitalClock,
  updateAttendanceTotals,
};
