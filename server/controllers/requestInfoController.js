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
  const includeAll = req.query.all === 'true' || req.query.all === '1';
  const history = await requestInfoService.getStatusHistory(req.params.id, { all: includeAll });
  res.json(history);
});

const uploadRequestLetter = asyncHandler(async (req, res) => {
  const record = await requestInfoService.uploadRequestLetter(req.params.id, req.file, req.user.name);
  res.json(record);
});

const uploadUrlLetter = asyncHandler(async (req, res) => {
  const record = await requestInfoService.uploadUrlLetter(req.params.id, req.file, req.user.name);
  res.json(record);
});

const uploadCompanyProfile = asyncHandler(async (req, res) => {
  const record = await requestInfoService.uploadCompanyProfile(req.params.id, req.file, req.user.name);
  res.json(record);
});

const updateConditions = asyncHandler(async (req, res) => {
  const record = await requestInfoService.updateConditions(req.params.id, req.body, req.user.name);
  res.json(record);
});

const updateRemarks = asyncHandler(async (req, res) => {
  const record = await requestInfoService.updateRemarks(req.params.id, req.body.remarks, req.user.name);
  res.json(record);
});

const updateCrStatus = asyncHandler(async (req, res) => {
  const record = await requestInfoService.updateCrStatus(
    req.params.id,
    req.body,
    req.user.name,
    req.file
  );
  res.json(record);
});

const streamAnalyticsDocument = asyncHandler(async (req, res) => {
  const download = req.query.download === '1' || req.query.download === 'true';
  const docType = req.params.docType;
  await requestInfoService.streamAnalyticsDocument(req.params.id, docType, res, { download });
});

const deleteAnalyticsDocumentHandler = asyncHandler(async (req, res) => {
  const record = await requestInfoService.deleteAnalyticsDocument(
    req.params.id,
    req.params.docType,
    req.user.name
  );
  res.json(record);
});


const deleteStatusHistory = asyncHandler(async (req, res) => {
  const result = await requestInfoService.deleteStatusHistory(req.params.id, req.params.historyId);
  res.json(result);
});

module.exports = {
  getRequestInfos,
  getRequestInfo,
  createRequestInfo,
  updateRequestInfo,
  deleteRequestInfo,
  updateStatus,
  getStatusHistory,
  uploadRequestLetter,
  uploadUrlLetter,
  uploadCompanyProfile,
  updateConditions,
  updateRemarks,
  updateCrStatus,
  streamAnalyticsDocument,
  deleteAnalyticsDocumentHandler,
  deleteStatusHistory,
};
