const requestInfoController = require('./requestInfoController');

module.exports = {
  getAnalytics: requestInfoController.getRequestInfos,
  createAnalytics: requestInfoController.createRequestInfo,
  updateAnalytics: requestInfoController.updateRequestInfo,
  deleteAnalytics: requestInfoController.deleteRequestInfo,
  updateStatus: requestInfoController.updateStatus,
  getStatusHistory: requestInfoController.getStatusHistory,
};
