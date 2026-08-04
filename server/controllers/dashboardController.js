const RequestInfo = require('../models/RequestInfo');
const Client = require('../models/Client');
const ReceivedInfo = require('../models/ReceivedInfo');
const User = require('../models/User');

let statsCache = { data: null, lastFetch: 0 };
const CACHE_TTL = 60 * 1000; // 1 minute

const getDashboardStats = async (req, res, next) => {
  try {
    const now = Date.now();
    if (statsCache.data && now - statsCache.lastFetch < CACHE_TTL) {
      return res.status(200).json({ success: true, data: statsCache.data });
    }

    const { getAgeDateRange } = require('../utils/ageFilterHelper');
    const ageQuery = getAgeDateRange('> 25 days');

    const [analyticsCount, clientsCount, receivedInfoCount, analyticsAgingAlertCount] = await Promise.all([
      RequestInfo.countDocuments(),
      Client.countDocuments(),
      ReceivedInfo.countDocuments(),
      ageQuery ? RequestInfo.countDocuments({ createdAt: ageQuery }) : 0,
    ]);

    statsCache.data = {
      analyticsCount,
      clientsCount,
      receivedInfoCount,
      analyticsAgingAlertCount,
    };
    statsCache.lastFetch = now;

    res.status(200).json({
      success: true,
      data: statsCache.data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
};
