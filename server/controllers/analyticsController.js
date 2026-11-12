const requestInfoController = require('./requestInfoController');

module.exports = {
  getAnalytics: requestInfoController.getRequestInfos,
  getAnalyticsById: requestInfoController.getRequestInfo,
  createAnalytics: requestInfoController.createRequestInfo,
  updateAnalytics: requestInfoController.updateRequestInfo,
  deleteAnalytics: requestInfoController.deleteRequestInfo,
  updateStatus: requestInfoController.updateStatus,
  getStatusHistory: requestInfoController.getStatusHistory,
  uploadRequestLetter: requestInfoController.uploadRequestLetter,
  uploadUrlLetter: requestInfoController.uploadUrlLetter,
  uploadCompanyProfile: requestInfoController.uploadCompanyProfile,
  updateConditions: requestInfoController.updateConditions,
  updateRemarks: requestInfoController.updateRemarks,
  updateCrStatus: requestInfoController.updateCrStatus,
  streamAnalyticsDocument: requestInfoController.streamAnalyticsDocument,
  deleteAnalyticsDocument: requestInfoController.deleteAnalyticsDocumentHandler,
  deleteStatusHistory: requestInfoController.deleteStatusHistory,
};
