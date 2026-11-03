const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { SERVER_ROOT, getUploadsRoot, normalizeStoredPath } = require('./clientDocumentPaths');

const getAnalyticsUploadDir = () => {
  const configured = process.env.ANALYTICS_UPLOADS_DIR;
  if (!configured) {
    return path.join(getUploadsRoot(), 'analytics');
  }
  return path.isAbsolute(configured)
    ? configured
    : path.join(SERVER_ROOT, configured.replace(/^\/+/, ''));
};

const buildAnalyticsDocumentPathCandidates = (storedPath) => {
  const normalized = normalizeStoredPath(storedPath);
  if (!normalized) return [];

  const uploadsRoot = getUploadsRoot();
  const analyticsDir = getAnalyticsUploadDir();
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

  if (relative.startsWith('analytics/')) {
    candidates.push(path.join(uploadsRoot, relative));
  }

  candidates.push(path.join(analyticsDir, basename));
  candidates.push(path.join(uploadsRoot, 'analytics', basename));
  candidates.push(path.join(SERVER_ROOT, 'uploads', 'analytics', basename));

  // Current working directory fallbacks (useful for PM2 / container / Hostinger working directory)
  candidates.push(path.join(process.cwd(), relative));
  candidates.push(path.join(process.cwd(), 'uploads', 'analytics', basename));
  candidates.push(path.join(process.cwd(), 'server', 'uploads', 'analytics', basename));

  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = path.normalize(candidate).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const resolveAnalyticsDocumentPath = async (storedPath, logContext = {}) => {
  const candidates = buildAnalyticsDocumentPathCandidates(storedPath);

  for (const candidate of candidates) {
    try {
      await fsp.access(candidate, fs.constants.R_OK);
      const stat = await fsp.stat(candidate);
      if (stat.isFile() && stat.size > 0) {
        return candidate;
      }
    } catch {
      // try next candidate
    }
  }

  console.error('[AnalyticsDocument] File not found on server', {
    ...logContext,
    storedPath,
    uploadsRoot: getUploadsRoot(),
    analyticsUploadDir: getAnalyticsUploadDir(),
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
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return mimeMap[ext] || fallback;
};

module.exports = {
  getAnalyticsUploadDir,
  buildAnalyticsDocumentPathCandidates,
  resolveAnalyticsDocumentPath,
  buildContentDisposition,
  getMimeType,
};
