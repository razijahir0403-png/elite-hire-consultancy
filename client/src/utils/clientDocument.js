import api from '../api';

const parseBlobError = async (blob) => {
  try {
    const text = await blob.text();
    const json = JSON.parse(text);
    return json.message || 'Failed to load document';
  } catch {
    return 'Failed to load document';
  }
};

/** Fetch client PDF via authenticated API and return a blob URL for preview/download. */
export const fetchClientPdfBlobUrl = async (clientId) => {
  const response = await api.get(`/clients/${clientId}/document`, {
    responseType: 'blob',
  });

  const { data, headers } = response;

  if (data.type === 'application/json' || (data.size > 0 && data.size < 500 && !data.type.includes('pdf'))) {
    throw new Error(await parseBlobError(data));
  }

  const blob = new Blob([data], {
    type: headers['content-type'] || 'application/pdf',
  });

  if (blob.size === 0) {
    throw new Error('Document file is empty');
  }

  return URL.createObjectURL(blob);
};

export const revokeBlobUrl = (blobUrl) => {
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
  }
};
