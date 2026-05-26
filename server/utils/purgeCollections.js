/**
 * Permanently delete ALL documents from analytics collections.
 * Uses MONGO_URI only (no in-memory fallback).
 * Run: npm run purge:data
 */
const path = require('path');
const dns = require('dns');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

dns.setDefaultResultOrder('ipv4first');

const COLLECTIONS = ['requestinfos'];

const toStandardMongoUri = (uri) => {
  if (!uri || !uri.startsWith('mongodb+srv://')) return uri;
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

const connectForPurge = async () => {
  const primary = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!primary) {
    throw new Error('MONGO_URI is not set in server/.env');
  }

  const uris = [primary, toStandardMongoUri(primary)].filter(
    (uri, i, list) => uri && list.indexOf(uri) === i
  );

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  const errors = [];
  for (const uri of uris) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
      return mongoose.connection;
    } catch (error) {
      errors.push(error.message);
    }
  }

  throw new Error(errors.join(' | '));
};

const run = async () => {
  try {
    const connection = await connectForPurge();
    const db = connection.db;

    process.stderr.write(
      `Connected to database "${connection.name}" on ${connection.host}\n`
    );

    for (const name of COLLECTIONS) {
      const collection = db.collection(name);
      const before = await collection.countDocuments();
      const result = await collection.deleteMany({});
      process.stderr.write(
        `${name}: removed ${result.deletedCount} of ${before} document(s)\n`
      );
    }

    process.stderr.write('Permanent purge complete.\n');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    process.stderr.write(`Purge failed: ${error.message}\n`);
    process.exit(1);
  }
};

run();
