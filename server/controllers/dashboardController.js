const RequestInfo = require('../models/RequestInfo');
const Client = require('../models/Client');
const ReceivedInfo = require('../models/ReceivedInfo');
const User = require('../models/User');

const getDashboardStats = async (req, res, next) => {
  try {
    const { getAgeDateRange } = require('../utils/ageFilterHelper');
    const ageQuery = getAgeDateRange('> 25 days');

    const [analyticsCount, clientsCount, receivedInfoCount, analyticsAgingAlertCount] = await Promise.all([
      RequestInfo.countDocuments(),
      Client.countDocuments(),
      ReceivedInfo.countDocuments(),
      ageQuery ? RequestInfo.countDocuments({ createdAt: ageQuery }) : 0,
    ]);

    res.status(200).json({
      success: true,
      data: {
        analyticsCount,
        clientsCount,
        receivedInfoCount,
        analyticsAgingAlertCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
};
