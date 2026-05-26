const getAllowedOrigins = () => {
  const fromEnv = process.env.CLIENT_URL || process.env.CORS_ORIGIN;

  if (fromEnv) {
    return fromEnv
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  // Development fallback
  if (process.env.NODE_ENV !== 'production') {
    return [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ];
  }

  return [];
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
  ],

  optionsSuccessStatus: 200,
};

module.exports = {
  corsOptions,
  getAllowedOrigins,
};