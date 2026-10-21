const express = require('express');
const {
  applyPermission,
  getMyPermissionRequests,
  getAllPermissionRequests,
  reviewPermissionRequest,
} = require('../controllers/permissionController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// Employee routes
router.post('/apply', applyPermission);
router.get('/my-requests', getMyPermissionRequests);

// Admin routes
router.get('/all', adminOnly, getAllPermissionRequests);
router.patch('/:id/review', adminOnly, reviewPermissionRequest);

module.exports = router;
