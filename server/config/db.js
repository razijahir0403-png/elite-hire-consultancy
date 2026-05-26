const dns = require('dns');
const mongoose = require('mongoose');

dns.setDefaultResultOrder('ipv4first');

const toStandardMongoUri = (uri) => {
  if (!uri || !uri.startsWith('mongodb+srv://')) {
    return uri;
  }

  const withoutProto = uri.slice('mongodb+srv://'.length);
  const atIdx = withoutProto.indexOf('@');
  const creds = atIdx >= 0 ? withoutProto.slice(0, atIdx + 1) : '';
  const rest = atIdx >= 0 ? withoutProto.slice(atIdx + 1) : withoutProto;
  const slashIdx = rest.indexOf('/');
  const host = slashIdx >= 0 ? rest.slice(0, slashIdx) : rest.split('?')[0];
  const pathAndQuery = slashIdx >= 0 ? rest.slice(slashIdx) : '/';

  let standard = `mongodb://${creds}${host}:27017${pathAndQuery}`;
  if (!standard.includes('retryWrites')) {
    standard += standard.includes('?') ? '&' : '?';
    standard += 'retryWrites=true&w=majority';
  }
  return standard;
};

const tryConnect = async (uri) => {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });
};

const connectWithMemoryServer = async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await tryConnect(uri);
  process.env.MONGO_URI = uri;
  return uri;
};

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  const fallbackUri =
    process.env.MONGO_URI_FALLBACK || 'mongodb://127.0.0.1:27017/elite-hire';

  if (!primaryUri) {
    throw new Error('MONGO_URI is not defined in environment variables.');
  }

  const candidates = [
    primaryUri,
    toStandardMongoUri(primaryUri),
    fallbackUri,
  ].filter((uri, index, list) => uri && list.indexOf(uri) === index);

  const errors = [];

  for (const uri of candidates) {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      await tryConnect(uri);
      return mongoose.connection;
    } catch (error) {
      errors.push(error.message);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      await connectWithMemoryServer();
      return mongoose.connection;
    } catch (error) {
      errors.push(error.message);
    }
  }

  throw new Error(
    `MongoDB connection failed. ${errors.join(' | ')}. ` +
      'For Atlas: whitelist your IP in Network Access and verify MONGO_URI credentials.'
  );
};

module.exports = connectDB;
