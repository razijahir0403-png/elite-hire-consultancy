const activityLogService = require('../services/activityLogService');

const activityLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    if (req.method === 'GET' && req.path === '/api/health') {
      return;
    }

    const durationMs = Date.now() - start;
    activityLogService
      .createLog({
        userId: req.user?._id,
        userName: req.user?.name || 'Anonymous',
        action: `${req.method} ${req.path}`,
        resourceType: req.baseUrl?.replace('/api/', '') || 'api',
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        statusCode: res.statusCode,
        details: { durationMs, bodyKeys: req.body ? Object.keys(req.body) : [] },
      })
      .catch(() => {});
  });

  next();
};

module.exports = activityLogger;
