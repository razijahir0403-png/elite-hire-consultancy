const express = require('express');
const router = express.Router();
const {
  getReceivedInfos,
  getReceivedInfo,
  createReceivedInfo,
  updateReceivedInfo,
  deleteReceivedInfo,
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

module.exports = router;
