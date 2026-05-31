/** Build absolute URL for static files served from /uploads (fallback). */
export const getUploadUrl = (relativePath) => {
  if (!relativePath) return null;
  const base =
    import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, '') ||
    (import.meta.env.PROD ? window.location.origin : '');
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return base ? `${base}${path}` : path;
};

/** Authenticated API URL for inline PDF streaming (preferred for preview). */
export const getClientDocumentApiUrl = (clientId, { download = false } = {}) => {
  const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
  const suffix = download ? '?download=1' : '';
  return `${apiBase}/clients/${clientId}/document${suffix}`;
};
