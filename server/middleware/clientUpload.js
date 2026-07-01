const path = require('path');
const fs = require('fs');
const multer = require('multer');
const AppError = require('../utils/AppError');
const { getClientsUploadDir } = require('../utils/clientDocumentPaths');

const UPLOAD_DIR = getClientsUploadDir();
const MAX_FILE_SIZE = 200 * 1024;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const safeBase = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 80);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${safeBase}.pdf`);
  },
});

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
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 2 },
});

const handleClientUpload = (req, res, next) => {
  uploadProfileDocument.fields([
    { name: 'profileDocument', maxCount: 1 },
    { name: 'proofDocument', maxCount: 1 }
  ])(req, res, (err) => {
    if (!err) return next();

    if (err instanceof AppError) {
      return next(err);
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File size must not exceed 200 KB.', 400));
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
  UPLOAD_DIR,
  MAX_FILE_SIZE,
};
