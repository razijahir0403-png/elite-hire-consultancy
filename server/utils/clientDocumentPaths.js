const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const SERVER_ROOT = path.join(__dirname, '..');

const getUploadsRoot = () => {
  const configured = process.env.UPLOADS_ROOT || process.env.UPLOAD_DIR;
  if (!configured) {
    return path.join(SERVER_ROOT, 'uploads');
  }
  return path.isAbsolute(configured)
    ? configured
    : path.join(SERVER_ROOT, configured.replace(/^\/+/, ''));
};

const getClientsUploadDir = () => {
  const configured = process.env.CLIENT_UPLOADS_DIR;
  if (!configured) {
    return path.join(getUploadsRoot(), 'clients');
  }
  return path.isAbsolute(configured)
    ? configured
    : path.join(SERVER_ROOT, configured.replace(/^\/+/, ''));
};

const normalizeStoredPath = (storedPath) =>
  String(storedPath || '')
    .trim()
    .replace(/\\/g, '/');

const buildDocumentPathCandidates = (storedPath) => {
  const normalized = normalizeStoredPath(storedPath);
  if (!normalized) return [];

  const uploadsRoot = getUploadsRoot();
  const clientsDir = getClientsUploadDir();
  const basename = path.basename(normalized);
  const relative = normalized.replace(/^\/+/, '');

  const candidates = [];

  if (path.isAbsolute(normalized)) {
    candidates.push(normalized);
  }

  candidates.push(path.join(SERVER_ROOT, relative));

  if (relative.startsWith('uploads/')) {
    candidates.push(path.join(SERVER_ROOT, relative));
  }

  if (relative.startsWith('clients/')) {
    candidates.push(path.join(uploadsRoot, relative));
  }

  candidates.push(path.join(clientsDir, basename));
  candidates.push(path.join(uploadsRoot, 'clients', basename));
  candidates.push(path.join(SERVER_ROOT, 'uploads', 'clients', basename));

  if (!relative.includes('/')) {
    candidates.push(path.join(clientsDir, relative));
  }

  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = path.normalize(candidate).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const resolveClientDocumentPath = async (storedPath, logContext = {}) => {
  const candidates = buildDocumentPathCandidates(storedPath);

  for (const candidate of candidates) {
    try {
      await fsp.access(candidate, fs.constants.R_OK);
      if (candidate !== path.normalize(path.join(SERVER_ROOT, normalizeStoredPath(storedPath).replace(/^\/+/, '')))) {
        console.warn('[ClientDocument] Resolved using fallback path', {
          ...logContext,
          storedPath,
          resolvedPath: candidate,
        });
      }
      return candidate;
    } catch {
      // try next candidate
    }
  }

  console.error('[ClientDocument] File not found on server', {
    ...logContext,
    storedPath,
    uploadsRoot: getUploadsRoot(),
    clientsUploadDir: getClientsUploadDir(),
    checkedPaths: candidates,
  });

  return null;
};

const resolveClientDocumentPathSync = (storedPath) => {
  const candidates = buildDocumentPathCandidates(storedPath);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
};

const toStoredDocumentPath = (filename) => `/uploads/clients/${filename}`;

module.exports = {
  SERVER_ROOT,
  getUploadsRoot,
  getClientsUploadDir,
  normalizeStoredPath,
  buildDocumentPathCandidates,
  resolveClientDocumentPath,
  resolveClientDocumentPathSync,
  toStoredDocumentPath,
};
