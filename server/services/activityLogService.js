const ActivityLog = require('../models/ActivityLog');
const AppError = require('../utils/AppError');

const createLog = async (payload) => {
  return ActivityLog.create(payload);
};

const getLogs = async ({ page = 1, limit = 20, action = '' }) => {
  const query = {};
  if (action) {
    query.action = { $regex: action, $options: 'i' };
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [records, totalRecords] = await Promise.all([
    ActivityLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    ActivityLog.countDocuments(query),
  ]);

  return {
    records,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalRecords / limitNum) || 1,
      totalRecords,
    },
  };
};

const getLogById = async (id) => {
  const log = await ActivityLog.findById(id);
  if (!log) {
    throw new AppError('Activity log not found', 404);
  }
  return log;
};

const softDeleteLog = async (id) => {
  const log = await ActivityLog.findById(id);
  if (!log) {
    throw new AppError('Activity log not found', 404);
  }
  return log.softDelete();
};

module.exports = {
  createLog,
  getLogs,
  getLogById,
  softDeleteLog,
};
