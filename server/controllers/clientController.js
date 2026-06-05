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
  const history = await clientService.getStatusHistory(req.params.id);
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
};
