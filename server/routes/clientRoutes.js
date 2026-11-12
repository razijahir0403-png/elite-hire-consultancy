const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { handleClientUpload } = require('../middleware/clientUpload');
const { handleClientAuditUpload } = require('../middleware/clientAuditUpload');
const validate = require('../middleware/validate');
const clientValidators = require('../utils/clientValidators');
const {
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
} = require('../controllers/clientController');

router.use(protect);

router.get('/export', clientValidators.listQuery, validate, exportClients);

router.put('/update-status/:id', clientValidators.updateStatus, validate, updateStatus);
router.get('/history/:id', clientValidators.idParam, validate, getStatusHistory);
router.delete('/history/:id/:historyId', adminOnly, deleteStatusHistoryHandler);
router.delete('/:id/history/:historyId', adminOnly, deleteStatusHistoryHandler);
router.get('/:id/document', clientValidators.idParam, validate, getClientDocument);
router.get('/:id/proof-document', clientValidators.idParam, validate, getClientProofDocument);

router
  .route('/')
  .get(clientValidators.listQuery, validate, getClients)
  .post(handleClientUpload, clientValidators.create, validate, createClient);

router
  .route('/:id')
  .get(clientValidators.idParam, validate, getClient)
  .put(handleClientUpload, clientValidators.update, validate, updateClient)
  .delete(clientValidators.idParam, validate, adminOnly, deleteClient);

// Audit document routes
router.post('/:id/audit-document/:docType', adminOnly, handleClientAuditUpload('document'), uploadClientAuditDocumentHandler);
router.get('/:id/audit-document/:docType', streamClientAuditDocumentHandler);
router.delete('/:id/audit-document/:docType', adminOnly, deleteClientAuditDocumentHandler);

// Conditions and Remarks routes
router.put('/:id/conditions', updateClientConditionsHandler);
router.put('/:id/remarks', updateClientRemarksHandler);

module.exports = router;
