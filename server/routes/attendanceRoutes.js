const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  recordLogin,
  endSession,
  recordLogout,
  getHistory,
  autoLogoutCron
} = require('../controllers/attendanceController');

const router = express.Router();

router.use(protect);

router.post('/login', recordLogin);
router.post('/end-session', endSession);
router.post('/logout', recordLogout);
router.patch('/auto-logout', async (req, res) => {
  await autoLogoutCron();
  res.status(200).json({ success: true, message: 'Auto logout triggered' });
});
router.get('/history/:email', getHistory);

module.exports = router;
