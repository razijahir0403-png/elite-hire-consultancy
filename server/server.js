const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const mongoose = require('mongoose');

const { port, nodeEnv, serveClient, validateEnv, uploadsRoot } = require('./config/env');
const { corsOptions } = require('./config/cors');
const connectDB = require('./config/db');
const { closeDB } = connectDB;
const seedDB = require('./utils/seeder');

const { notFound, errorHandler } = require('./middleware/errorHandler');
const activityLogger = require('./middleware/activityLogger');
const { initSocket } = require('./socket');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');
const requestInfoRoutes = require('./routes/requestInfoRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const clientRoutes = require('./routes/clientRoutes');
const receivedInfoRoutes = require('./routes/receivedInfoRoutes');
const receivedInfoAuditRoutes = require('./routes/receivedInfoAuditRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const chatRoutes = require('./routes/chatRoutes');
const permissionRoutes = require('./routes/permissionRoutes');

const cron = require('node-cron');
const { autoLogoutCron } = require('./controllers/attendanceController');

validateEnv();

const app = express();

/* ----------------------------- SECURITY ----------------------------- */

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(compression());

/* ------------------------------- CORS ------------------------------- */

app.use(cors(corsOptions));

/* ----------------------------- BODY PARSER ----------------------------- */

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ------------------------------ STATICS ------------------------------ */

app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(uploadsRoot, {
    setHeaders(res, filePath) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.txt': 'text/plain; charset=utf-8',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      if (mimeMap[ext]) {
        res.setHeader('Content-Type', mimeMap[ext]);
      }
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

/* ----------------------------- MIDDLEWARE ---------------------------- */

app.use(activityLogger);

/* ------------------------------ HEALTH ------------------------------ */

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    message: 'Elite Hire Consultancy API is running',
    environment: nodeEnv,
    database:
      mongoose.connection.readyState === 1
        ? 'connected'
        : 'disconnected',
    timestamp: new Date(),
  });
});

/* ------------------------------- ROUTES ------------------------------ */

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/requestinfos', requestInfoRoutes);
app.use('/api/activitylogs', activityLogRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/received-info', receivedInfoRoutes);
app.use('/api/received-info-audit', receivedInfoAuditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/permission', permissionRoutes);

/* -------------------------- SERVE FRONTEND --------------------------- */

if (nodeEnv === 'production' && serveClient) {
  const clientDist = path.join(__dirname, '../client/dist');

  app.use(
    express.static(clientDist, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      },
    })
  );

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }

    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

/* --------------------------- ERROR HANDLER --------------------------- */

app.use(notFound);
app.use(errorHandler);

/* ---------------------------- START SERVER --------------------------- */

const startServer = async () => {
  try {
    await connectDB();

    // Optional Seeder
    await seedDB();

    const server = http.createServer(app);
    const io = initSocket(server);
    app.set('io', io);

    let shuttingDown = false;

    const shutdown = async (signal) => {
      if (shuttingDown) {
        return;
      }
      shuttingDown = true;
      console.log(`${signal} received. Shutting down gracefully...`);

      const forceExit = setTimeout(() => {
        console.error('Graceful shutdown timed out. Forcing exit.');
        process.exit(1);
      }, 10000);
      forceExit.unref();

      server.close(async () => {
        try {
          if (io && typeof io.close === 'function') {
            io.close();
          }
          await closeDB();
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error.message);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    server.listen(port, () => {
      console.log(`🚀 Server running on port ${port} [${nodeEnv}] with Socket.IO`);
    });

    // Initialize Auto-Logout Cron Job to run every midnight (00:00:00) IST
    cron.schedule('0 0 * * *', () => {
      console.log('Running Midnight Auto-Logout Cron...');
      autoLogoutCron();
    }, {
      timezone: "Asia/Kolkata"
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use`);
        process.exit(1);
      }

      console.error('❌ Server Error:', err);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message || error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
