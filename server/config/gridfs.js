/**
 * GridFS Configuration
 *
 * Provides a reusable GridFSBucket bound to the existing Mongoose connection.
 * - Bucket name: toolDocuments
 * - Initialises lazily after the MongoDB connection is ready
 * - Never creates a second connection; always reuses mongoose.connection
 */

const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

const BUCKET_NAME = 'toolDocuments';

let _bucket = null;

/**
 * Returns the GridFSBucket, initialising it on first call.
 * Throws if the connection is not yet open.
 */
const getBucket = () => {
  if (_bucket) return _bucket;

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error(
      '[GridFS] MongoDB connection is not ready. ' +
        'Call getBucket() only after connectDB() has resolved.'
    );
  }

  _bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
  return _bucket;
};

/**
 * Resets the cached bucket (useful for testing or reconnection scenarios).
 */
const resetBucket = () => {
  _bucket = null;
};

/**
 * Initialise the bucket right after the mongoose connection opens.
 * Call this once from server startup, after connectDB().
 */
const initGridFS = () => {
  // If already connected, initialise immediately
  if (mongoose.connection.readyState === 1) {
    getBucket();
    console.log(`[GridFS] Bucket "${BUCKET_NAME}" initialised.`);
    return;
  }

  // Otherwise wait for the open event
  mongoose.connection.once('open', () => {
    getBucket();
    console.log(`[GridFS] Bucket "${BUCKET_NAME}" initialised after connection opened.`);
  });
};

module.exports = { getBucket, resetBucket, initGridFS, BUCKET_NAME };
