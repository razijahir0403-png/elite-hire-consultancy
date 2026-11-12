const receivedInfoService = require('../services/receivedInfoService');
const asyncHandler = require('../utils/asyncHandler');

const getReceivedInfos = asyncHandler(async (req, res, next) => {
  try {
    const result = await receivedInfoService.getReceivedInfos(req.query);
    res.json(result);
  } catch (error) {
    console.error('[ReceivedInfoController] Error in getReceivedInfos. Error:', error);
    next(error);
  }
});

const getReceivedInfo = asyncHandler(async (req, res, next) => {
  try {
    const record = await receivedInfoService.getReceivedInfoById(req.params.id);
    res.json(record);
  } catch (error) {
    console.error('[ReceivedInfoController] Error in getReceivedInfo. Error:', error);
    next(error);
  }
});

const createReceivedInfo = asyncHandler(async (req, res, next) => {
  try {
    const record = await receivedInfoService.createReceivedInfo(req.body, req.user.name);
    res.status(201).json(record);
  } catch (error) {
    console.error('[ReceivedInfoController] Error creating lead. Error:', error);
    next(error);
  }
});

const updateReceivedInfo = asyncHandler(async (req, res, next) => {
  try {
    const record = await receivedInfoService.updateReceivedInfo(req.params.id, req.body, req.user.name);
    res.json(record);
  } catch (error) {
    console.error('[ReceivedInfoController] Error updating lead. Error:', error);
    next(error);
  }
});

const deleteReceivedInfo = asyncHandler(async (req, res, next) => {
  try {
    const result = await receivedInfoService.softDeleteReceivedInfo(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('[ReceivedInfoController] Error deleting lead. Error:', error);
    next(error);
  }
});

const updateStatus = asyncHandler(async (req, res, next) => {
  try {
    const record = await receivedInfoService.updateReceivedStatus(
      req.params.id,
      req.body,
      req.user.name
    );
    res.json(record);
  } catch (error) {
    console.error('[ReceivedInfoController] Error updating status. Error:', error);
    next(error);
  }
});

const getStatusHistory = asyncHandler(async (req, res, next) => {
  try {
    const includeAll = req.query.all === 'true' || req.query.all === '1';
    const history = await receivedInfoService.getStatusHistory(req.params.id, { all: includeAll });
    res.json(history);
  } catch (error) {
    console.error('[ReceivedInfoController] Error getting status history. Error:', error);
    next(error);
  }
});


const deleteStatusHistory = asyncHandler(async (req, res, next) => {
  try {
    const result = await receivedInfoService.deleteStatusHistory(req.params.id, req.params.historyId);
    res.json(result);
  } catch (error) {
    console.error('[ReceivedInfoController] Error deleting status history. Error:', error);
    next(error);
  }
});

module.exports = {
  getReceivedInfos,
  getReceivedInfo,
  createReceivedInfo,
  updateReceivedInfo,
  deleteReceivedInfo,
  updateStatus,
  getStatusHistory,
  deleteStatusHistory,
};
