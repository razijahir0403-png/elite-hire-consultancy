const path = require('path');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const { corsOptions } = require('./config/cors');
const { port, nodeEnv, serveClient, validateEnv } = require('./config/env');
const seedDB = require('./utils/seeder');

const { notFound, errorHandler } = require('./middleware/errorHandler');
const activityLogger = require('./middleware/activityLogger');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');
const requestInfoRoutes = require('./routes/requestInfoRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const clientRoutes = require('./routes/clientRoutes');
const receivedInfoRoutes = require('./routes/receivedInfoRoutes');

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
  express.static(path.join(__dirname, 'uploads'), {
    setHeaders(res, filePath) {
      if (filePath.endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
      }
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

/* -------------------------- SERVE FRONTEND --------------------------- */

if (nodeEnv === 'production' && serveClient) {
  const clientDist = path.join(__dirname, '../client/dist');

  app.use(express.static(clientDist));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
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

    const server = app.listen(port, () => {
      console.log(`✅ Server running on port ${port} (${nodeEnv})`);
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
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();