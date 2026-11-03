const getAllowedOrigins = () => {
  const fromEnv = process.env.CLIENT_URL || process.env.CORS_ORIGIN;
  const origins = fromEnv
    ? fromEnv.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];

  // Always permit local development origins
  const localOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
  ];

  localOrigins.forEach((orig) => {
    if (!origins.includes(orig)) {
      origins.push(orig);
    }
  });

  return origins;
};

const allowedOrigins = getAllowedOrigins();

const corsOptions = {
  origin(origin, callback) {
    // Allow Postman / Mobile Apps / Server Requests
    if (!origin) {
      return callback(null, true);
    }

    // Allow configured origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error(`❌ CORS blocked for origin: ${origin}`);

    return callback(
      new Error(`CORS blocked for origin: ${origin}`),
      false
    );
  },

  credentials: true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
  ],

  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'Content-Disposition',
  ],

  optionsSuccessStatus: 200,
};

module.exports = {
  corsOptions,
  getAllowedOrigins,
};