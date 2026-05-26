const express = require('express');
const router = express.Router();
const {
  getActivityLogs,
  getActivityLog,
  createActivityLog,
  deleteActivityLog,
} = require('../controllers/activityLogController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { activityLogValidators } = require('../utils/validators');
const validate = require('../middleware/validate');

router.use(protect, adminOnly);

router.route('/')
  .get(getActivityLogs)
  .post(activityLogValidators.create, validate, createActivityLog);

router.route('/:id')
  .get(activityLogValidators.idParam, validate, getActivityLog)
  .delete(activityLogValidators.idParam, validate, deleteActivityLog);

module.exports = router;
