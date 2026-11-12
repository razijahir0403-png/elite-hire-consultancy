const express = require('express');
const router = express.Router();
const {
  getRequestInfos,
  getRequestInfo,
  createRequestInfo,
  updateRequestInfo,
  deleteRequestInfo,
  updateStatus,
  getStatusHistory,
  deleteStatusHistory,
} = require('../controllers/requestInfoController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { requestInfoValidators } = require('../utils/validators');
const validate = require('../middleware/validate');

router.use(protect);

router.put('/update-status/:id', requestInfoValidators.updateStatus, validate, updateStatus);
router.get('/history/:id', requestInfoValidators.idParam, validate, getStatusHistory);
router.delete('/history/:id/:historyId', adminOnly, deleteStatusHistory);
router.delete('/:id/history/:historyId', adminOnly, deleteStatusHistory);

router.route('/')
  .get(requestInfoValidators.listQuery, validate, getRequestInfos)
  .post(requestInfoValidators.create, validate, createRequestInfo);

router.route('/:id')
  .get(requestInfoValidators.idParam, validate, getRequestInfo)
  .put(requestInfoValidators.update, validate, updateRequestInfo)
  .delete(requestInfoValidators.idParam, validate, adminOnly, deleteRequestInfo);

module.exports = router;
