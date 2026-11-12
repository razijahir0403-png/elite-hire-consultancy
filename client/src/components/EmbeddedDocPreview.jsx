import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Download, AlertCircle, FileText, RotateCw } from 'lucide-react';
import api from '../api';

const parseBlobErrorMessage = async (blob) => {
  try {
    const text = await blob.text();
    const json = JSON.parse(text);
    return json.message || 'Failed to load document';
  } catch {
    return 'Failed to load document';
  }
};

const EmbeddedDocPreview = ({
  fileName = '',
  apiUrl = '',
  fetchBlob = null,
  onClose,
  onDownload,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [contentType, setContentType] = useState('');

  const ext = (fileName || '').split('.').pop().toLowerCase();
  const isPdfFormat = ext === 'pdf' || contentType.includes('pdf');
  const isImageFormat =
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext) ||
    contentType.startsWith('image/');

  const loadDocument = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let data;
      let type = '';

      if (typeof fetchBlob === 'function') {
        const result = await fetchBlob();
        if (result?.blobUrl) {
          setBlobUrl(result.blobUrl);
          setContentType(result.contentType || '');
          setLoading(false);
          return;
        }
        data = result?.data || result;
        type = result?.contentType || '';
      } else if (apiUrl) {
        const response = await api.get(apiUrl, {
          responseType: 'blob',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        });
        data = response.data;
        type = response.headers?.['content-type'] || '';
      } else {
        throw new Error('No document source provided.');
      }

      if (!data) {
        throw new Error('No document data received.');
      }

      if (data.type === 'application/json' || (data.size < 500 && data.type?.includes('json'))) {
        const errMsg = await parseBlobErrorMessage(data);
        throw new Error(errMsg);
      }

      if (data.size === 0) {
        throw new Error('Document file is empty.');
      }

      const fileExt = (fileName || '').split('.').pop().toLowerCase();
      let finalType = type || data.type || '';
      if (!finalType || finalType === 'application/octet-stream') {
        if (fileExt === 'pdf') {
          finalType = 'application/pdf';
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(fileExt)) {
          finalType = fileExt === 'jpg' ? 'image/jpeg' : `image/${fileExt}`;
        }
      }

      const blob = new Blob([data], { type: finalType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);

      setBlobUrl(url);
      setContentType(finalType);
    } catch (err) {
      console.error('Failed to preview document:', err);
      const msg = err.response?.data?.message || err.message || 'Unable to load document preview.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, fetchBlob, fileName]);

  useEffect(() => {
    loadDocument();
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [loadDocument]);

  return (
    <div className="space-y-4 text-slate-800">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          title="Return to document details"
        >
          <ArrowLeft size={14} />
          <span>Close Preview</span>
        </button>

        <div className="flex items-center space-x-2 min-w-0">
          <span
            className="text-xs font-bold text-slate-700 truncate max-w-[160px] sm:max-w-xs"
            title={fileName || 'Document'}
          >
            {fileName || 'Document Preview'}
          </span>
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Download Document"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="w-full">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 rounded-full border-3 border-[#00B96B] border-t-transparent animate-spin" />
            <p className="text-xs font-bold text-slate-700">Loading document preview...</p>
            <p className="text-[11px] text-slate-400">Please wait while the document is prepared</p>
          </div>
        ) : error ? (
          <div className="py-12 px-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-red-800 mb-0.5">Preview Failed</p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
            <div className="flex items-center justify-center space-x-2 pt-1">
              <button
                type="button"
                onClick={loadDocument}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                <RotateCw size={12} />
                <span>Retry</span>
              </button>
              {onDownload && (
                <button
                  type="button"
                  onClick={onDownload}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  <Download size={12} />
                  <span>Download File</span>
                </button>
              )}
            </div>
          </div>
        ) : isPdfFormat && blobUrl ? (
          <div className="w-full h-[62vh] sm:h-[68vh] rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shadow-inner">
            <iframe
              src={`${blobUrl}#toolbar=1&navpanes=0`}
              title={fileName || 'PDF Document'}
              className="w-full h-full border-0"
            />
          </div>
        ) : isImageFormat && blobUrl ? (
          <div className="w-full h-[62vh] sm:h-[68vh] rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center p-3 overflow-auto shadow-inner">
            <img
              src={blobUrl}
              alt={fileName || 'Image preview'}
              className="max-w-full max-h-full object-contain rounded-lg shadow-sm select-none"
            />
          </div>
        ) : (
          <div className="py-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D5F5E7] text-[#07566A] flex items-center justify-center mx-auto shadow-2xs">
              <FileText size={24} />
            </div>
            <div>
              <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                Preview Not Supported
              </h5>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Embedded preview is not supported for this file format ({ext ? `.${ext}` : 'file'}). Please download the file to view it on your device.
              </p>
            </div>
            {onDownload && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onDownload}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-[#00D98B] to-[#00B96B] text-[#07566A] font-extrabold text-xs rounded-xl shadow-xs hover:shadow-sm cursor-pointer"
                >
                  <Download size={14} />
                  <span>Download File</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-[11px] text-slate-400">
          {isPdfFormat ? 'PDF Preview' : isImageFormat ? 'Image Preview' : 'Document View'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
        >
          Close Preview
        </button>
      </div>
    </div>
  );
};

export default EmbeddedDocPreview;
