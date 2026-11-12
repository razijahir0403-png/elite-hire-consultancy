const path = require('path');
const fs = require('fs');
const multer = require('multer');
const AppError = require('../utils/AppError');
const { getUploadsRoot } = require('../utils/clientDocumentPaths');

const UPLOAD_DIR = path.join(getUploadsRoot(), 'received-info-audit');
const MAX_FILE_SIZE = 150 * 1024; // 150 KB (153,600 bytes) strictly enforced

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${safeBase}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  // Allow documents and images
  const allowedExts = ['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext) || file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
    return;
  }
  cb(new AppError('Allowed file types: PDF, Word, Images, Text files.', 400), false);
};

const multerInstance = multer({
  storage,
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
          // Double safeguard
          try {
            fs.unlinkSync(req.file.path);
          } catch {}
          return next(new AppError('File size must not exceed 150 KB.', 400));
        }
        return next();
      }

      if (err instanceof AppError) {
        return next(err);
      }

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
  UPLOAD_DIR,
  MAX_FILE_SIZE,
};