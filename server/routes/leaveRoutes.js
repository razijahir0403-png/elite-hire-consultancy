const express = require('express');
const {
  applyLeave,
  getMyLeaveRequests,
  getAllLeaveRequests,
  reviewLeaveRequest
} = require('../controllers/leaveController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// Employee routes
router.post('/apply', applyLeave);
router.get('/my-requests', getMyLeaveRequests);

// Admin routes
router.get('/all', adminOnly, getAllLeaveRequests);
router.patch('/:id/review', adminOnly, reviewLeaveRequest);

module.exports = router;
