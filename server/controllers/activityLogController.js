const activityLogService = require('../services/activityLogService');
const asyncHandler = require('../utils/asyncHandler');

const getActivityLogs = asyncHandler(async (req, res) => {
  const result = await activityLogService.getLogs(req.query);
  res.json(result);
});

const getActivityLog = asyncHandler(async (req, res) => {
  const log = await activityLogService.getLogById(req.params.id);
  res.json(log);
});

const createActivityLog = asyncHandler(async (req, res) => {
  const log = await activityLogService.createLog({
    ...req.body,
    userId: req.user?._id,
    userName: req.user?.name,
  });
  res.status(201).json(log);
});

const deleteActivityLog = asyncHandler(async (req, res) => {
  await activityLogService.softDeleteLog(req.params.id);
  res.json({ message: 'Activity log archived successfully (soft delete)' });
});

module.exports = {
  getActivityLogs,
  getActivityLog,
  createActivityLog,
  deleteActivityLog,
};
