const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getAnalytics,
  createAnalytics,
  updateAnalytics,
  deleteAnalytics,
  updateStatus,
  getStatusHistory,
} = require('../controllers/analyticsController');
const { requestInfoValidators } = require('../utils/validators');
const validate = require('../middleware/validate');

router.use(protect);

router.put('/update-status/:id', requestInfoValidators.updateStatus, validate, updateStatus);
router.get('/history/:id', requestInfoValidators.idParam, validate, getStatusHistory);

router.route('/')
  .get(requestInfoValidators.listQuery, validate, getAnalytics)
  .post(requestInfoValidators.create, validate, createAnalytics);

router.route('/:id')
  .put(requestInfoValidators.update, validate, updateAnalytics)
  .delete(requestInfoValidators.idParam, validate, deleteAnalytics);

module.exports = router;
