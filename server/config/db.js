const path = require('path');
const dns = require('dns');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Node's DNS resolver (c-ares) often fails SRV lookups on Windows even when
// OS DNS works. Prefer public IPv4 resolvers before loading Mongoose.
dns.setDefaultResultOrder('ipv4first');
const configuredDns = dns.getServers();
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1', ...configuredDns.filter((server) => !server.includes(':'))]);

const mongoose = require('mongoose');

const MONGOOSE_OPTIONS = {
  serverSelectionTimeoutMS: 20000,
  connectTimeoutMS: 20000,
  socketTimeoutMS: 45000,
  family: 4,
  maxPoolSize: 10,
};

const redactMongoUri = (uri = '') =>
  String(uri).replace(/\/\/([^:/@]+):([^@]+)@/g, '//$1:***@');

const sanitizeErrorText = (value = '') =>
  redactMongoUri(String(value)).replace(/mongodb(\+srv)?:\/\/[^\s'"]+/gi, '[redacted-mongo-uri]');

const formatMongoError = (error) => {
  const code = error?.code || error?.cause?.code || '';
  const message = sanitizeErrorText(error?.message || String(error));
  const combined = `${code} ${message}`;

  if (/querySrv|EREFUSED|ENOTFOUND|ENODATA|ETIMEOUT|EAI_AGAIN/i.test(combined)) {
    return (
      'Could not connect to MongoDB Atlas: DNS/SRV lookup failed. ' +
      'Confirm internet access and that local DNS can resolve `_mongodb._tcp.<cluster>.mongodb.net`. ' +
      'If this persists, set the machine DNS to 8.8.8.8 or 1.1.1.1. ' +
      `Details: ${message}`
    );
  }

  if (/Authentication failed|bad auth|auth failed/i.test(combined)) {
    return 'Could not connect to MongoDB Atlas: authentication failed. Verify the username and password in MONGO_URI.';
  }

  if (/whitelist|IP that isn't|not allowed to connect|SslHandshakeFailed/i.test(combined)) {
    return (
      'Could not connect to MongoDB Atlas: this client IP is not allowed (or TLS failed). ' +
      'In Atlas, open Network Access and whitelist your current public IP (or 0.0.0.0/0 for development). ' +
      `Details: ${message}`
    );
  }

  if (/ECONNREFUSED/i.test(combined)) {
    return (
      'Could not connect to MongoDB Atlas: connection refused. ' +
      'This is not a local MongoDB fallback. Check Atlas host reachability, firewall, and Network Access. ' +
      `Details: ${message}`
    );
  }

  return `Could not connect to MongoDB Atlas. ${message}`;
};

const assertMongoUri = () => {
  const mongoUri = (process.env.MONGO_URI || process.env.MONGODB_URI || '').trim();

  if (!mongoUri) {
    throw new Error(
      'MONGO_URI is not defined. Set it in server/.env before starting the server. ' +
        'Do not use a localhost MongoDB URI unless that is the intended database.'
    );
  }

  if (!/^mongodb(\+srv)?:\/\//i.test(mongoUri)) {
    throw new Error('MONGO_URI must be a valid MongoDB connection string (mongodb:// or mongodb+srv://).');
  }

  return mongoUri;
};

const connectDB = async () => {
  const mongoUri = assertMongoUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  try {
    await mongoose.connect(mongoUri, MONGOOSE_OPTIONS);
  } catch (error) {
    throw new Error(formatMongoError(error));
  }

  const { host, name, port } = mongoose.connection;
  console.log(`MongoDB connected (${host}${port ? `:${port}` : ''} / ${name})`);

  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', sanitizeErrorText(error.message));
  });

  mongoose.connection.on('disconnected', () => {
    console.error('MongoDB disconnected.');
  });

  return mongoose.connection;
};

const closeDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

module.exports = connectDB;
module.exports.closeDB = closeDB;
