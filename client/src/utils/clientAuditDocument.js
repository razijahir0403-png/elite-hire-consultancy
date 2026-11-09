import api from '../api';
import { toast } from 'react-toastify';

export const getAuthToken = () => {
  try {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      return parsed.token || '';
    }
  } catch {}
  return '';
};

export const getClientAuditDocumentUrl = (clientId, docType, { download = false } = {}) => {
  if (!clientId || !docType) return '#';
  const token = getAuthToken();
  const apiBase = (
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api')
  ).replace(/\/$/, '');
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  if (download) params.set('download', '1');
  const qs = params.toString();
  return `${apiBase}/clients/${clientId}/audit-document/${docType}${qs ? `?${qs}` : ''}`;
};

const parseContentDispositionFilename = (header, fallback = '') => {
  if (!header) return fallback;
  const utf8Match = header.match(/filename\*=UTF-8''([^;\s]+)/i);
  if (utf8Match?.[1]) { try { return decodeURIComponent(utf8Match[1]); } catch {} }
  const quoteMatch = header.match(/filename="([^"]+)"/i);
  if (quoteMatch?.[1]) return quoteMatch[1];
  const plainMatch = header.match(/filename=([^;\s]+)/i);
  if (plainMatch?.[1]) return plainMatch[1].replace(/['"]/g, '');
  return fallback;
};

const parseBlobErrorMessage = async (blob) => {
  try {
    const text = await blob.text();
    const json = JSON.parse(text);
    return json.message || 'Failed to process document';
  } catch {
    return 'Failed to process document';
  }
};

export const viewClientAuditDocument = async (clientId, docType, filename = '') => {
  if (!clientId || !docType) { toast.error('Document reference is missing.'); return; }
  const isOfficeDoc = /\.(docx?|xlsx?|pptx?)$/i.test(filename || '');
  if (isOfficeDoc) {
    toast.info('Downloading Office document...');
    await downloadClientAuditDocument(clientId, docType, filename);
    return;
  }
  let preOpenedTab = null;
  try {
    preOpenedTab = window.open('about:blank', '_blank');
    if (preOpenedTab?.document) {
      preOpenedTab.document.title = filename || 'Loading Document...';
      preOpenedTab.document.body.innerHTML = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;background:#F8FAFC;color:#334155;">
          <div style="padding:24px 32px;background:white;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.06);text-align:center;">
            <div style="width:36px;height:36px;border:3px solid #00B96B;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>
            <h3 style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#07566A;">Loading Document</h3>
            <p style="margin:0;font-size:13px;color:#64748B;">${filename || 'Please wait...'}</p>
          </div>
          <style>@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style>
        </div>`;
    }
  } catch {}
  try {
    const response = await api.get(`/clients/${clientId}/audit-document/${docType}`, { responseType: 'blob' });
    const { data, headers } = response;
    if (data.type === 'application/json' || (data.size < 500 && data.type.includes('json'))) {
      const errMsg = await parseBlobErrorMessage(data);
      throw new Error(errMsg);
    }
    const contentType = headers['content-type'] || 'application/pdf';
    const blob = new Blob([data], { type: contentType });
    if (blob.size === 0) throw new Error('Document file is empty.');
    const blobUrl = URL.createObjectURL(blob);
    if (preOpenedTab && !preOpenedTab.closed) {
      preOpenedTab.location.href = blobUrl;
    } else {
      const opened = window.open(blobUrl, '_blank');
      if (!opened) window.open(getClientAuditDocumentUrl(clientId, docType), '_blank');
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
  } catch (err) {
    if (preOpenedTab && !preOpenedTab.closed) preOpenedTab.close();
    toast.error(err.response?.data?.message || err.message || 'Unable to load document.');
  }
};

export const downloadClientAuditDocument = async (clientId, docType, defaultFilename = '') => {
  if (!clientId || !docType) { toast.error('Document reference is missing.'); return; }
  try {
    const response = await api.get(`/clients/${clientId}/audit-document/${docType}`, {
      responseType: 'blob',
      params: { download: '1' },
    });
    const { data, headers } = response;
    if (data.type === 'application/json' || (data.size < 500 && data.type.includes('json'))) {
      const errMsg = await parseBlobErrorMessage(data);
      throw new Error(errMsg);
    }
    const contentType = headers['content-type'] || 'application/octet-stream';
    const blob = new Blob([data], { type: contentType });
    if (blob.size === 0) throw new Error('Document file is empty.');
    const filename = parseContentDispositionFilename(headers['content-disposition'], defaultFilename || `${docType}-document`);
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (err) {
    toast.error(err.response?.data?.message || err.message || 'Unable to download document.');
  }
};
