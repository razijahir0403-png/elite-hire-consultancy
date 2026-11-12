const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { param } = require('express-validator');
const {
  getAnalytics,
  getAnalyticsById,
  createAnalytics,
  updateAnalytics,
  deleteAnalytics,
  updateStatus,
  getStatusHistory,
  uploadRequestLetter,
  uploadUrlLetter,
  uploadCompanyProfile,
  updateConditions,
  updateRemarks,
  updateCrStatus,
  streamAnalyticsDocument,
  deleteAnalyticsDocument,
  deleteStatusHistory,
} = require('../controllers/analyticsController');
const { requestInfoValidators } = require('../utils/validators');
const validate = require('../middleware/validate');
const { handleDocumentUpload } = require('../middleware/analyticsUpload');

router.use(protect);

router.put('/update-status/:id', requestInfoValidators.updateStatus, validate, updateStatus);
router.get('/history/:id', requestInfoValidators.idParam, validate, getStatusHistory);
router.delete('/history/:id/:historyId', adminOnly, deleteStatusHistory);
router.delete('/:id/history/:historyId', adminOnly, deleteStatusHistory);

// Action Section Endpoints
router.post(
  '/:id/request-letter',
  adminOnly,
  handleDocumentUpload('document'),
  requestInfoValidators.idParam,
  validate,
  uploadRequestLetter
);

router.post(
  '/:id/url-letter',
  adminOnly,
  handleDocumentUpload('document'),
  requestInfoValidators.idParam,
  validate,
  uploadUrlLetter
);

router.post(
  '/:id/company-profile',
  adminOnly,
  handleDocumentUpload('document'),
  requestInfoValidators.idParam,
  validate,
  uploadCompanyProfile
);

// Authenticated Document Streaming (View and Download)
router.get(
  '/:id/document/:docType',
  requestInfoValidators.idParam,
  validate,
  streamAnalyticsDocument
);

// Permanent Document Deletion (Admin only)
router.delete(
  '/:id/document/:docType',
  adminOnly,
  [
    ...requestInfoValidators.idParam,
    param('docType')
      .isIn(['request-letter', 'url-letter', 'company-profile'])
      .withMessage('docType must be one of: request-letter, url-letter, company-profile'),
  ],
  validate,
  deleteAnalyticsDocument
);

router.get(
  '/:id/request-letter/document',
  requestInfoValidators.idParam,
  validate,
  (req, res, next) => {
    req.params.docType = 'request-letter';
    streamAnalyticsDocument(req, res, next);
  }
);

router.get(
  '/:id/url-letter/document',
  requestInfoValidators.idParam,
  validate,
  (req, res, next) => {
    req.params.docType = 'url-letter';
    streamAnalyticsDocument(req, res, next);
  }
);

router.get(
  '/:id/company-profile/document',
  requestInfoValidators.idParam,
  validate,
  (req, res, next) => {
    req.params.docType = 'company-profile';
    streamAnalyticsDocument(req, res, next);
  }
);

router.put(
  '/:id/conditions',
  requestInfoValidators.idParam,
  validate,
  updateConditions
);

router.put(
  '/:id/remarks',
  requestInfoValidators.idParam,
  validate,
  updateRemarks
);

router.put(
  '/:id/cr-status',
  requestInfoValidators.updateCrStatus,
  validate,
  updateCrStatus
);

router.route('/')
  .get(requestInfoValidators.listQuery, validate, getAnalytics)
  .post(requestInfoValidators.create, validate, createAnalytics);

router.route('/:id')
  .get(requestInfoValidators.idParam, validate, getAnalyticsById)
  .put(requestInfoValidators.update, validate, updateAnalytics)
  .delete(requestInfoValidators.idParam, validate, adminOnly, deleteAnalytics);

module.exports = router;
