/**
 * GridFS Service
 *
 * Reusable functions for uploading, streaming, downloading and deleting
 * files stored in MongoDB GridFS using the "toolDocuments" bucket.
 *
 * Rules:
 *  - Never opens a second MongoDB connection – uses the shared Mongoose connection.
 *  - Accepts Buffer (from multer memoryStorage) for uploads.
 *  - Streams directly from GridFS for view / download.
 *  - Validates ObjectIds before any GridFS operation.
 *  - Handles incomplete uploads and failed streams gracefully.
 */

const { ObjectId } = require('mongodb');
const { Readable } = require('stream');
const AppError = require('../utils/AppError');
const { getBucket } = require('../config/gridfs');

// ─────────────────────────── helpers ───────────────────────────

/**
 * Parse and validate a GridFS ObjectId string.
 * Returns a proper ObjectId or throws AppError 400.
 */
const toObjectId = (id) => {
  if (!id) throw new AppError('GridFS file ID is required', 400);
  const str = String(id);
  if (!ObjectId.isValid(str)) throw new AppError(`Invalid GridFS file ID: ${str}`, 400);
  return new ObjectId(str);
};

/**
 * Convert a Buffer to a Readable stream.
 */
const bufferToStream = (buffer) => {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
};

// ─────────────────────────── upload ────────────────────────────

/**
 * Upload a file buffer to GridFS.
 *
 * @param {Buffer}  buffer         File contents (from multer memoryStorage)
 * @param {string}  originalName   Original filename
 * @param {string}  mimeType       MIME type
 * @param {object}  metadata       Arbitrary metadata stored alongside the file
 * @returns {Promise<object>}      { gridfsId, filename, contentType, size, uploadedAt }
 */
const uploadToGridFS = (buffer, originalName, mimeType, metadata = {}) => {
  return new Promise((resolve, reject) => {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return reject(new AppError('Empty or invalid file buffer provided', 400));
    }

    const bucket = getBucket();
    const uploadStream = bucket.openUploadStream(originalName, {
      contentType: mimeType || 'application/octet-stream',
      metadata,
    });

    let finished = false;

    uploadStream.on('error', (err) => {
      if (finished) return;
      finished = true;
      console.error('[GridFS] Upload stream error:', err.message);
      // Attempt to abort / clean up the partial upload
      bucket.delete(uploadStream.id).catch(() => {});
      reject(new AppError('Failed to upload file to storage', 500));
    });

    uploadStream.on('finish', () => {
      if (finished) return;
      finished = true;
      resolve({
        gridfsId: uploadStream.id,
        filename: originalName,
        contentType: mimeType || 'application/octet-stream',
        size: buffer.length,
        uploadedAt: new Date(),
      });
    });

    const readable = bufferToStream(buffer);
    readable.on('error', (err) => {
      if (finished) return;
      finished = true;
      console.error('[GridFS] Readable stream error during upload:', err.message);
      uploadStream.destroy(err);
      reject(new AppError('Failed to read file buffer', 500));
    });

    readable.pipe(uploadStream);
  });
};

// ─────────────────────────── stream / download ──────────────────

/**
 * Stream a GridFS file to an HTTP response.
 *
 * @param {string|ObjectId} gridfsId   The GridFS file _id
 * @param {string}          filename   Filename for Content-Disposition
 * @param {string}          mimeType   MIME type override (falls back to stored contentType)
 * @param {object}          res        Express response object
 * @param {boolean}         download   true → attachment, false → inline
 */
const streamFromGridFS = async (gridfsId, filename, mimeType, res, download = false) => {
  const fileId = toObjectId(gridfsId);
  const bucket = getBucket();

  // Fetch file metadata first to set Content-Length
  const files = await bucket.find({ _id: fileId }).toArray();
  if (!files || files.length === 0) {
    throw new AppError('File not found in storage', 404);
  }

  const fileDoc = files[0];
  const resolvedMime = mimeType || fileDoc.contentType || 'application/octet-stream';
  const resolvedName = filename || fileDoc.filename || 'document';
  const safeFilename = String(resolvedName).replace(/[^\w.\-() ]/g, '_');
  const disposition = download ? 'attachment' : 'inline';

  res.setHeader('Content-Type', resolvedMime);
  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(resolvedName)}`
  );
  res.setHeader('Content-Length', fileDoc.length);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  return new Promise((resolve, reject) => {
    let finished = false;
    const downloadStream = bucket.openDownloadStream(fileId);

    downloadStream.on('error', (err) => {
      if (finished) return;
      finished = true;
      console.error('[GridFS] Download stream error:', { gridfsId: String(fileId), error: err.message });
      if (!res.headersSent) {
        reject(new AppError('Failed to stream file from storage', 500));
      } else {
        res.destroy();
        reject(err);
      }
    });

    res.on('finish', () => {
      if (finished) return;
      finished = true;
      resolve();
    });

    res.on('error', (err) => {
      if (finished) return;
      finished = true;
      reject(err);
    });

    res.on('close', () => {
      if (!finished) {
        finished = true;
        downloadStream.destroy();
      }
    });

    downloadStream.pipe(res);
  });
};

// ─────────────────────────── metadata ──────────────────────────

/**
 * Get GridFS file metadata for a given file ID.
 * Returns null if not found.
 */
const getGridFSFileMetadata = async (gridfsId) => {
  if (!gridfsId) return null;
  try {
    const fileId = toObjectId(gridfsId);
    const bucket = getBucket();
    const files = await bucket.find({ _id: fileId }).toArray();
    return files.length > 0 ? files[0] : null;
  } catch {
    return null;
  }
};

// ─────────────────────────── delete ────────────────────────────

/**
 * Delete a file and its chunks from GridFS.
 * Best-effort: logs a warning if file is not found but does NOT throw.
 */
const deleteFromGridFS = async (gridfsId) => {
  if (!gridfsId) return;
  try {
    const fileId = toObjectId(gridfsId);
    const bucket = getBucket();
    await bucket.delete(fileId);
  } catch (err) {
    // FileNotFound is benign – the file may have already been removed
    if (err.message && err.message.includes('FileNotFound')) {
      console.warn('[GridFS] File not found during delete (already removed?):', String(gridfsId));
      return;
    }
    console.error('[GridFS] Failed to delete file:', { gridfsId: String(gridfsId), error: err.message });
    throw new AppError('Failed to delete file from storage', 500);
  }
};

// ─────────────────────────── lookup by metadata ────────────────

/**
 * Find a GridFS file by metadata fields (recordId + documentType).
 * Returns the latest file (by uploadDate) if multiple match.
 * Returns the file document or null.
 */
const findGridFSFileByMetadata = async (recordId, documentType) => {
  if (!recordId || !documentType) return null;
  try {
    const bucket = getBucket();
    const files = await bucket
      .find({
        'metadata.recordId': String(recordId),
        'metadata.documentType': String(documentType),
      })
      .sort({ uploadDate: -1 })
      .limit(1)
      .toArray();
    return files.length > 0 ? files[0] : null;
  } catch (err) {
    console.warn('[GridFS] findByMetadata error:', err.message);
    return null;
  }
};

// ─────────────────────────── migration helper ──────────────────

/**
 * Upload a local file (by absolute path) to GridFS.
 * Used during one-time migration of existing disk files.
 *
 * @param {string} absolutePath   Absolute path to the file on disk
 * @param {string} originalName   Original filename
 * @param {string} mimeType       MIME type
 * @param {object} metadata       Extra metadata
 * @returns {Promise<object>}     GridFS result object
 */
const uploadLocalFileToGridFS = (absolutePath, originalName, mimeType, metadata = {}) => {
  const fs = require('fs');
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(absolutePath)) {
      return reject(new AppError(`Local file not found: ${absolutePath}`, 404));
    }

    const buffer = fs.readFileSync(absolutePath);
    if (!buffer || buffer.length === 0) {
      return reject(new AppError(`Local file is empty: ${absolutePath}`, 400));
    }

    uploadToGridFS(buffer, originalName, mimeType, metadata).then(resolve).catch(reject);
  });
};

module.exports = {
  uploadToGridFS,
  streamFromGridFS,
  getGridFSFileMetadata,
  deleteFromGridFS,
  findGridFSFileByMetadata,
  uploadLocalFileToGridFS,
  toObjectId,
};
