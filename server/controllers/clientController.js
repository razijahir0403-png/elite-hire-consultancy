const clientService = require('../services/clientService');
const asyncHandler = require('../utils/asyncHandler');

const getClients = asyncHandler(async (req, res) => {
  const result = await clientService.getClients(req.query);
  res.json(result);
});

const getClient = asyncHandler(async (req, res) => {
  const record = await clientService.getClientById(req.params.id);
  res.json(record);
});

const createClient = asyncHandler(async (req, res) => {
  const record = await clientService.createClient(req.body, req.files, req.user.name);
  res.status(201).json(record);
});

const updateClient = asyncHandler(async (req, res) => {
  const record = await clientService.updateClient(req.params.id, req.body, req.files, req.user.name);
  res.json(record);
});

const deleteClient = asyncHandler(async (req, res) => {
  const result = await clientService.softDeleteClient(req.params.id);
  res.json(result);
});

const updateStatus = asyncHandler(async (req, res) => {
  const record = await clientService.updateClientStatus(req.params.id, req.body, req.user.name);
  res.json(record);
});

const getStatusHistory = asyncHandler(async (req, res) => {
  const includeAll = req.query.all === 'true' || req.query.all === '1';
  const history = await clientService.getStatusHistory(req.params.id, { all: includeAll });
  res.json(history);
});

const exportClients = asyncHandler(async (req, res) => {
  const records = await clientService.exportClients(req.query);
  res.json({ records, total: records.length });
});

const getClientDocument = asyncHandler(async (req, res) => {
  const download = req.query.download === '1' || req.query.download === 'true';
  await clientService.streamClientDocument(req.params.id, res, { download });
});

const getClientProofDocument = asyncHandler(async (req, res) => {
  const download = req.query.download === '1' || req.query.download === 'true';
  await clientService.streamClientProofDocument(req.params.id, res, { download });
});


const uploadClientAuditDocumentHandler = asyncHandler(async (req, res, next) => {
  try {
    const record = await clientService.uploadClientAuditDocument(req.params.id, req.params.docType, req.file, req.user.name);
    res.json(record);
  } catch (error) { next(error); }
});

const streamClientAuditDocumentHandler = asyncHandler(async (req, res, next) => {
  try {
    const download = req.query.download === '1';
    await clientService.streamClientAuditDocument(req.params.id, req.params.docType, res, { download });
  } catch (error) { next(error); }
});

const deleteClientAuditDocumentHandler = asyncHandler(async (req, res, next) => {
  try {
    const record = await clientService.deleteClientAuditDocument(req.params.id, req.params.docType, req.user.name);
    res.json(record);
  } catch (error) { next(error); }
});

const updateClientConditionsHandler = asyncHandler(async (req, res, next) => {
  try {
    const record = await clientService.updateClientConditions(req.params.id, req.body, req.user.name);
    res.json(record);
  } catch (error) { next(error); }
});

const updateClientRemarksHandler = asyncHandler(async (req, res, next) => {
  try {
    const record = await clientService.updateClientRemarks(req.params.id, req.body.remarks, req.user.name);
    res.json(record);
  } catch (error) { next(error); }
});


const deleteStatusHistoryHandler = asyncHandler(async (req, res) => {
  const result = await clientService.deleteStatusHistory(req.params.id, req.params.historyId);
  res.json(result);
});

module.exports = {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  updateStatus,
  getStatusHistory,
  exportClients,
  getClientDocument,
  getClientProofDocument,
  uploadClientAuditDocumentHandler,
  streamClientAuditDocumentHandler,
  deleteClientAuditDocumentHandler,
  updateClientConditionsHandler,
  updateClientRemarksHandler,
  deleteStatusHistoryHandler,
};

