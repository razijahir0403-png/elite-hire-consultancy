const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { handleClientUpload } = require('../middleware/clientUpload');
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
} = require('../controllers/clientController');

router.use(protect);

router.get('/export', clientValidators.listQuery, validate, exportClients);

router.put('/update-status/:id', clientValidators.updateStatus, validate, updateStatus);
router.get('/history/:id', clientValidators.idParam, validate, getStatusHistory);
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

module.exports = router;
