/**
 * Client Audit Upload Middleware (GridFS version)
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

const ALLOWED_MIMETYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg']);

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIMETYPES.has(file.mimetype) || ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(new AppError('Only PDF, DOC, DOCX, TXT, PNG, JPG files are allowed.', 400), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

const handleClientAuditUpload = (fieldName = 'document') =>
  (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (!err) return next();
      if (err instanceof AppError) return next(err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File size must not exceed 150 KB.', 400));
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new AppError('Unexpected file field.', 400));
      }
      return next(err);
    });
  };

module.exports = {
  handleClientAuditUpload,
  MAX_FILE_SIZE,
};
