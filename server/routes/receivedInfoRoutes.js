const express = require('express');
const router = express.Router();
const {
  getReceivedInfos,
  getReceivedInfo,
  createReceivedInfo,
  updateReceivedInfo,
  deleteReceivedInfo,
  updateStatus,
  getStatusHistory,
} = require('../controllers/receivedInfoController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { receivedInfoValidators } = require('../utils/validators');
const validate = require('../middleware/validate');

router.use(protect);

router.route('/')
  .get(receivedInfoValidators.listQuery, validate, getReceivedInfos)
  .post(receivedInfoValidators.create, validate, createReceivedInfo);

router.route('/:id')
  .get(receivedInfoValidators.idParam, validate, getReceivedInfo)
  .put(receivedInfoValidators.update, validate, updateReceivedInfo)
  .delete(receivedInfoValidators.idParam, validate, adminOnly, deleteReceivedInfo);

router.route('/:id/status')
  .put(receivedInfoValidators.idParam, validate, updateStatus);

router.route('/:id/status-history')
  .get(receivedInfoValidators.idParam, validate, getStatusHistory);

module.exports = router;
