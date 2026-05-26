const requestInfoService = require('../services/requestInfoService');
const asyncHandler = require('../utils/asyncHandler');

const getRequestInfos = asyncHandler(async (req, res) => {
  const result = await requestInfoService.getRequestInfos(req.query);
  res.json(result);
});

const getRequestInfo = asyncHandler(async (req, res) => {
  const record = await requestInfoService.getRequestInfoById(req.params.id);
  res.json(record);
});

const createRequestInfo = asyncHandler(async (req, res) => {
  const record = await requestInfoService.createRequestInfo(req.body, req.user.name);
  res.status(201).json(record);
});

const updateRequestInfo = asyncHandler(async (req, res) => {
  const record = await requestInfoService.updateRequestInfo(req.params.id, req.body, req.user.name);
  res.json(record);
});

const deleteRequestInfo = asyncHandler(async (req, res) => {
  const result = await requestInfoService.softDeleteRequestInfo(req.params.id);
  res.json(result);
});

const updateStatus = asyncHandler(async (req, res) => {
  const record = await requestInfoService.updateRequestStatus(
    req.params.id,
    req.body,
    req.user.name
  );
  res.json(record);
});

const getStatusHistory = asyncHandler(async (req, res) => {
  const history = await requestInfoService.getStatusHistory(req.params.id);
  res.json(history);
});

module.exports = {
  getRequestInfos,
  getRequestInfo,
  createRequestInfo,
  updateRequestInfo,
  deleteRequestInfo,
  updateStatus,
  getStatusHistory,
};
