/**
 * Client Upload Middleware (GridFS version)
 *
 * Uses multer memoryStorage so the file buffer is passed directly
 * to GridFS without being written to the local filesystem.
 *
 * File size limit: 150 KB (matches the original disk-storage limit).
 * Allowed types: PDF only (profileDocument and proofDocument).
 */

const multer = require('multer');
const path = require('path');
const AppError = require('../utils/AppError');

const MAX_FILE_SIZE = 150 * 1024; // 150 KB

const fileFilter = (_req, file, cb) => {
  const isPdf =
    file.mimetype === 'application/pdf' ||
    path.extname(file.originalname).toLowerCase() === '.pdf';

  if (isPdf) {
    cb(null, true);
    return;
  }
  cb(new AppError('Only PDF files are allowed.', 400), false);
};

const uploadProfileDocument = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 2 },
});

const handleClientUpload = (req, res, next) => {
  uploadProfileDocument.fields([
    { name: 'profileDocument', maxCount: 1 },
    { name: 'proofDocument', maxCount: 1 },
  ])(req, res, (err) => {
    if (!err) return next();

    if (err instanceof AppError) return next(err);

    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File size must not exceed 150 KB.', 400));
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('Too many files uploaded or unexpected file field.', 400));
    }
    if (err.message === 'Only PDF files are allowed.') {
      return next(new AppError('Only PDF files are allowed.', 400));
    }

    return next(err);
  });
};

module.exports = {
  handleClientUpload,
  MAX_FILE_SIZE,
};
