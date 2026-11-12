const receivedInfoAuditService = require('../services/receivedInfoAuditService');
const asyncHandler = require('../utils/asyncHandler');

const getReceivedInfoAudit = asyncHandler(async (req, res) => {
  const record = await receivedInfoAuditService.getReceivedInfoAuditById(req.params.id);
  res.json(record);
});

const getStatusHistory = asyncHandler(async (req, res) => {
  const includeAll = req.query.all === 'true' || req.query.all === '1';
  const history = await receivedInfoAuditService.getStatusHistory(req.params.id, { all: includeAll });
  res.json(history);
});

const uploadProposalRequest = asyncHandler(async (req, res) => {
  const record = await receivedInfoAuditService.uploadProposalRequest(req.params.id, req.file, req.user.name);
  res.json(record);
});

const uploadContractAgreement = asyncHandler(async (req, res) => {
  const record = await receivedInfoAuditService.uploadContractAgreement(req.params.id, req.file, req.user.name);
  res.json(record);
});

const uploadMouFile = asyncHandler(async (req, res) => {
  const record = await receivedInfoAuditService.uploadMouFile(req.params.id, req.file, req.user.name);
  res.json(record);
});

const updateConditions = asyncHandler(async (req, res) => {
  const record = await receivedInfoAuditService.updateConditions(req.params.id, req.body, req.user.name);
  res.json(record);
});

const updateRemarks = asyncHandler(async (req, res) => {
  const record = await receivedInfoAuditService.updateRemarks(req.params.id, req.body.remarks, req.user.name);
  res.json(record);
});

const streamReceivedInfoAuditDocument = asyncHandler(async (req, res) => {
  const download = req.query.download === '1' || req.query.download === 'true';
  const docType = req.params.docType;
  await receivedInfoAuditService.streamReceivedInfoAuditDocument(req.params.id, docType, res, { download });
});

const deleteReceivedInfoAuditDocument = asyncHandler(async (req, res) => {
  const record = await receivedInfoAuditService.deleteReceivedInfoAuditDocument(
    req.params.id,
    req.params.docType,
    req.user.name
  );
  res.json(record);
});


const deleteStatusHistory = asyncHandler(async (req, res) => {
  const result = await receivedInfoAuditService.deleteStatusHistory(req.params.id, req.params.historyId);
  res.json(result);
});

module.exports = {
  getReceivedInfoAudit,
  getStatusHistory,
  uploadProposalRequest,
  uploadContractAgreement,
  uploadMouFile,
  updateConditions,
  updateRemarks,
  streamReceivedInfoAuditDocument,
  deleteReceivedInfoAuditDocument,
  deleteStatusHistory,
};