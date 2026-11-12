const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { param } = require('express-validator');
const {
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
} = require('../controllers/receivedInfoAuditController');
const { receivedInfoValidators } = require('../utils/validators');
const validate = require('../middleware/validate');
const { handleDocumentUpload } = require('../middleware/receivedInfoAuditUpload');

router.use(protect);

// History endpoint
router.get('/history/:id', receivedInfoValidators.idParam, validate, getStatusHistory);
router.delete('/history/:id/:historyId', adminOnly, deleteStatusHistory);
router.delete('/:id/history/:historyId', adminOnly, deleteStatusHistory);

// Action Section Endpoints - Document Uploads (Admin only)
router.post(
  '/:id/proposal-request',
  adminOnly,
  handleDocumentUpload('document'),
  receivedInfoValidators.idParam,
  validate,
  uploadProposalRequest
);

router.post(
  '/:id/contract-agreement',
  adminOnly,
  handleDocumentUpload('document'),
  receivedInfoValidators.idParam,
  validate,
  uploadContractAgreement
);

router.post(
  '/:id/mou-file',
  adminOnly,
  handleDocumentUpload('document'),
  receivedInfoValidators.idParam,
  validate,
  uploadMouFile
);

// Authenticated Document Streaming (View and Download)
router.get(
  '/:id/document/:docType',
  receivedInfoValidators.idParam,
  validate,
  streamReceivedInfoAuditDocument
);

// Convenience document endpoints
router.get(
  '/:id/proposal-request/document',
  receivedInfoValidators.idParam,
  validate,
  (req, res, next) => {
    req.params.docType = 'proposal-request';
    streamReceivedInfoAuditDocument(req, res, next);
  }
);

router.get(
  '/:id/contract-agreement/document',
  receivedInfoValidators.idParam,
  validate,
  (req, res, next) => {
    req.params.docType = 'contract-agreement';
    streamReceivedInfoAuditDocument(req, res, next);
  }
);

router.get(
  '/:id/mou-file/document',
  receivedInfoValidators.idParam,
  validate,
  (req, res, next) => {
    req.params.docType = 'mou-file';
    streamReceivedInfoAuditDocument(req, res, next);
  }
);

// Permanent Document Deletion (Admin only)
router.delete(
  '/:id/document/:docType',
  adminOnly,
  [
    ...receivedInfoValidators.idParam,
    param('docType')
      .isIn(['proposal-request', 'contract-agreement', 'mou-file'])
      .withMessage('docType must be one of: proposal-request, contract-agreement, mou-file'),
  ],
  validate,
  deleteReceivedInfoAuditDocument
);

// Conditions Required endpoints
router.put(
  '/:id/conditions',
  receivedInfoValidators.idParam,
  validate,
  updateConditions
);

// Remarks endpoint
router.put(
  '/:id/remarks',
  receivedInfoValidators.idParam,
  validate,
  updateRemarks
);

// Get record by ID
router.get('/:id', receivedInfoValidators.idParam, validate, getReceivedInfoAudit);

module.exports = router;