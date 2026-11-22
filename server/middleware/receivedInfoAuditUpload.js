/**
 * Received Info Audit Upload Middleware (GridFS version)
 *
 * Uses multer memoryStorage so the file buffer is passed directly
 * to GridFS without being written to the local filesystem.
 *
 * File size limit: 150 KB (matches the original disk-storage limit).
 * Allowed types: PDF, DOC, DOCX, TXT, PNG, JPG, JPEG.
 */

const multer = require('multer');
const path = require('path');
const AppError = require('../utils/AppError');

const MAX_FILE_SIZE = 150 * 1024; // 150 KB

const fileFilter = (_req, file, cb) => {
  const allowedExts = ['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (
    allowedExts.includes(ext) ||
    file.mimetype.startsWith('image/') ||
    file.mimetype === 'application/pdf'
  ) {
    cb(null, true);
    return;
  }
  cb(new AppError('Allowed file types: PDF, Word, Images, Text files.', 400), false);
};

const multerInstance = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

const handleDocumentUpload = (fieldName = 'document') => {
  return (req, res, next) => {
    if (!req.is('multipart/form-data')) {
      return next();
    }

    multerInstance.single(fieldName)(req, res, (err) => {
      if (!err) {
        if (req.file && req.file.size > MAX_FILE_SIZE) {
          return next(new AppError('File size must not exceed 150 KB.', 400));
        }
        return next();
      }

      if (err instanceof AppError) return next(err);

      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File size must not exceed 150 KB.', 400));
      }
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new AppError('Only one file can be uploaded at a time.', 400));
      }

      return next(err);
    });
  };
};

module.exports = {
  handleDocumentUpload,
  MAX_FILE_SIZE,
};
