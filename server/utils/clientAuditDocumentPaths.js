const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { SERVER_ROOT, getUploadsRoot, normalizeStoredPath } = require('./clientDocumentPaths');

const getClientAuditUploadDir = () => {
  const configured = process.env.CLIENT_AUDIT_UPLOADS_DIR;
  if (!configured) {
    return path.join(getUploadsRoot(), 'clients-audit');
  }
  return path.isAbsolute(configured)
    ? configured
    : path.join(SERVER_ROOT, configured.replace(/^\/+/, ''));
};

const buildClientAuditPathCandidates = (storedPath) => {
  const normalized = normalizeStoredPath(storedPath);
  if (!normalized) return [];

  const uploadsRoot = getUploadsRoot();
  const auditDir = getClientAuditUploadDir();
  const basename = path.basename(normalized);
  const relative = normalized.replace(/^\/+/, '');

  const candidates = [];

  if (path.isAbsolute(normalized)) candidates.push(normalized);
  candidates.push(path.join(SERVER_ROOT, relative));
  if (relative.startsWith('uploads/')) candidates.push(path.join(SERVER_ROOT, relative));
  if (relative.startsWith('clients-audit/')) candidates.push(path.join(uploadsRoot, relative));
  candidates.push(path.join(auditDir, basename));
  candidates.push(path.join(uploadsRoot, 'clients-audit', basename));
  candidates.push(path.join(SERVER_ROOT, 'uploads', 'clients-audit', basename));
  candidates.push(path.join(process.cwd(), relative));
  candidates.push(path.join(process.cwd(), 'uploads', 'clients-audit', basename));
  candidates.push(path.join(process.cwd(), 'server', 'uploads', 'clients-audit', basename));

  const seen = new Set();
  return candidates.filter((c) => {
    const key = path.normalize(c).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const resolveClientAuditDocumentPath = async (storedPath, logContext = {}) => {
  const candidates = buildClientAuditPathCandidates(storedPath);
  for (const candidate of candidates) {
    try {
      await fsp.access(candidate, fs.constants.R_OK);
      const stat = await fsp.stat(candidate);
      if (stat.isFile() && stat.size > 0) return candidate;
    } catch {
      // try next
    }
  }
  console.error('[ClientAuditDocument] File not found on server', {
    ...logContext,
    storedPath,
    checkedPaths: candidates,
  });
  return null;
};

const buildContentDisposition = (filename, download = false) => {
  const safeFilename = String(filename || 'document').replace(/[^\w.\-() ]/g, '_');
  const disposition = download ? 'attachment' : 'inline';
  return `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(filename || safeFilename)}`;
};

const getMimeType = (filename = '', fallback = 'application/octet-stream') => {
  const ext = path.extname(filename).toLowerCase();
  const mimeMap = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return mimeMap[ext] || fallback;
};

const toStoredClientAuditPath = (filename) => `/uploads/clients-audit/${filename}`;

module.exports = {
  getClientAuditUploadDir,
  buildClientAuditPathCandidates,
  resolveClientAuditDocumentPath,
  buildContentDisposition,
  getMimeType,
  toStoredClientAuditPath,
};
