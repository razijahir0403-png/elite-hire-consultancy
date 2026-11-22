const fs = require('fs');
const path = require('path');
const ReceivedInfo = require('../models/ReceivedInfo');
const AppError = require('../utils/AppError');
const {
  resolveReceivedInfoAuditDocumentPath,
  buildContentDisposition,
  getMimeType,
} = require('../utils/receivedInfoAuditDocumentPaths');
const {
  uploadToGridFS,
  streamFromGridFS,
  deleteFromGridFS,
  findGridFSFileByMetadata,
} = require('./gridfsService');
const {
  RI_CONDITION_KEY_TO_CODE,
  RI_CODE_TO_KEY,
  RI_LABEL_TO_CODE,
  RI_CONDITIONS_LIST,
  toRiConditionCode,
  getRiConditionLabel,
  getRiConditionKey,
} = require('../utils/riStatusMaster');
const { toReceivedInfoStatusCode, ReceivedInfoStatusLabel, isWorkflowStatusHistory } = require('../utils/statusMaster');

// Helper to ensure record's workflow status is integer
const ensureIntegerStatus = (record) => {
  if (record && (record.status !== undefined || record.currentStatus !== undefined || record.initialStatus !== undefined)) {
    const convert = (val) => {
      if (val === undefined || val === null || val === '') return null;
      if (typeof val === 'number' && Number.isInteger(val)) return val;
      if (typeof val === 'string') {
        const parsed = Number(val);
        if (Number.isInteger(parsed)) return parsed;
        return toReceivedInfoStatusCode(val, null);
      }
      return null;
    };
    record.status = convert(record.status) || convert(record.currentStatus) || convert(record.initialStatus);
    record.currentStatus = record.status;
    record.initialStatus = convert(record.initialStatus) || record.status;
  }
  return record;
};

const normalizeReceivedInfoRecord = (doc) => {
  if (!doc) return doc;
  const data = doc.toObject ? doc.toObject() : { ...doc };
  const obj = { ...data };
  obj.id = obj._id;

  // Normalize status to integer (1-15) for workflow status using centralized helper
  const convertStatus = (val) => {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'number' && Number.isInteger(val)) return val;
    if (typeof val === 'string') {
      const parsed = Number(val);
      if (Number.isInteger(parsed)) return parsed;
      // Convert legacy string label to integer using centralized mapping
      return toReceivedInfoStatusCode(val, null);
    }
    return null;
  };

  let resolvedStatus = convertStatus(obj.status) || convertStatus(obj.currentStatus) || convertStatus(obj.initialStatus);
  obj.status = resolvedStatus;
  obj.currentStatus = resolvedStatus;
  obj.initialStatus = convertStatus(obj.initialStatus) || (Array.isArray(obj.statusHistory) && obj.statusHistory[0]?.status ? convertStatus(obj.statusHistory[0].status) : null) || resolvedStatus;

  // Normalize document fields
  const normDoc = (docObj, type) => {
    if (!docObj) return {};
    const gId = docObj.gridfsId ? String(docObj.gridfsId) : '';
    const base = {
      fileName: docObj.fileName || docObj.name || docObj.originalName || '',
      name: docObj.name || docObj.fileName || docObj.originalName || '',
      originalName: docObj.originalName || docObj.fileName || docObj.name || '',
      fileType: docObj.fileType || '',
      fileUrl: docObj.fileUrl || docObj.path || '',
      path: docObj.path || docObj.fileUrl || '',
      fileId: gId,
      gridfsId: gId,
      contentType: docObj.contentType || '',
      storageType: gId ? 'gridfs' : (docObj.fileUrl || docObj.path ? 'local' : ''),
      fileSize: docObj.fileSize || docObj.size || 0,
      size: docObj.size || docObj.fileSize || 0,
      uploadedAt: docObj.uploadedAt || null,
      uploadedBy: docObj.uploadedBy || '',
      recordId: docObj.recordId || obj._id || null,
    };
    return base;
  };

  const propDoc = normDoc(obj.proposalRequest || obj.clProofDoc, 'proposal-request');
  obj.proposalRequest = propDoc;
  obj.clProofDoc = propDoc;

  const contractDoc = normDoc(obj.contractAgreement || obj.coverLetter, 'contract-agreement');
  obj.contractAgreement = contractDoc;
  obj.coverLetter = contractDoc;

  const mouDoc = normDoc(obj.mouFile || obj.clProfileDoc, 'mou-file');
  obj.mouFile = mouDoc;
  obj.clProfileDoc = mouDoc;

  // Normalize conditionsRequired and latest CR Status
  let crStatusCode = toRiConditionCode(obj.crStatus || obj.riStatus || obj.activeCondition);

  if (!crStatusCode && Array.isArray(obj.statusHistory) && obj.statusHistory.length > 0) {
    const sortedHistory = [...obj.statusHistory].sort(
      (a, b) => new Date(b.updatedOn || 0) - new Date(a.updatedOn || 0)
    );
    for (const h of sortedHistory) {
      if (h.description) {
        const match = h.description.match(/(?:CR|RI)\s*(?:Condition|Status)\s*set\s*to\s*([^:]+)/i);
        if (match && match[1]) {
          const codeFromDesc = toRiConditionCode(match[1].trim());
          if (codeFromDesc) {
            crStatusCode = codeFromDesc;
            break;
          }
        }
      }
    }
  }

  if (!crStatusCode && Array.isArray(obj.remarksHistory) && obj.remarksHistory.length > 0) {
    const sortedRemarks = [...obj.remarksHistory].sort(
      (a, b) => new Date(b.updatedOn || 0) - new Date(a.updatedOn || 0)
    );
    for (const r of sortedRemarks) {
      const codeFromRemark = toRiConditionCode(r.crStatus || r.riStatus);
      if (codeFromRemark) {
        crStatusCode = codeFromRemark;
        break;
      }
    }
  }

  const conditionsRequired = {};
  Object.keys(RI_CONDITION_KEY_TO_CODE).forEach((k) => {
    conditionsRequired[k] = crStatusCode ? RI_CONDITION_KEY_TO_CODE[k] === crStatusCode : false;
  });
  obj.conditionsRequired = conditionsRequired;
  obj.crStatusCode = crStatusCode || null;
  obj.crStatus = crStatusCode ? getRiConditionLabel(crStatusCode) : '-';
  obj.riStatusCode = obj.crStatusCode;
  obj.riStatus = obj.crStatus;
  obj.activeCondition = crStatusCode ? getRiConditionLabel(crStatusCode) : '';
  obj.onHoldDeadline = obj.onHoldDeadline || null;

  obj.remarks = obj.remarks || '';
  obj.remarksHistory = Array.isArray(obj.remarksHistory) ? obj.remarksHistory : [];

  if (Array.isArray(obj.statusHistory)) {
    obj.statusHistory = obj.statusHistory.map((item) => {
      const itemObj = item.toObject ? item.toObject() : { ...item };
      // Ensure status in history is integer using centralized helper
      itemObj.status = convertStatus(itemObj.status);
      return itemObj;
    });
  } else {
    obj.statusHistory = [];
  }

  return obj;
};

const uploadProposalRequest = async (id, file, editorName) => {
  const record = await ReceivedInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }
  ensureIntegerStatus(record);
  if (!file) {
    throw new AppError('Please select a file to upload', 400);
  }
  if (file.size > 150 * 1024) {
    throw new AppError('File size must not exceed 150 KB.', 400);
  }

  // Delete previous GridFS file if it exists
  const previousGridfsId = record.proposalRequest?.gridfsId;
  if (previousGridfsId) {
    try { await deleteFromGridFS(previousGridfsId); } catch (e) {
      console.warn('[uploadProposalRequest] Could not delete previous GridFS file:', e.message);
    }
  }

  // Upload to GridFS
  const gridfsResult = await uploadToGridFS(file.buffer, file.originalname, file.mimetype, {
    recordId: record._id.toString(),
    documentType: 'proposal-request',
    uploadedBy: editorName,
  });

  record.proposalRequest = {
    fileName: file.originalname,
    name: file.originalname,
    fileUrl: '',
    path: '',
    gridfsId: gridfsResult.gridfsId,
    contentType: gridfsResult.contentType,
    fileSize: file.size,
    size: file.size,
    uploadedAt: new Date(),
    uploadedBy: editorName,
  };

  record.updatedBy = editorName;
  record.updatedOn = new Date();

  // Record audit history entry
  record.statusHistory = record.statusHistory || [];
  record.statusHistory.push({
    status: record.status,
    description: `Proposal Request uploaded: ${file.originalname}`,
    updatedBy: editorName,
    updatedOn: new Date(),
  });

  const saved = await record.save();
  return normalizeReceivedInfoRecord(saved);
};

const uploadContractAgreement = async (id, file, editorName) => {
  const record = await ReceivedInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }
  ensureIntegerStatus(record);
  if (!file) {
    throw new AppError('Please select a file to upload', 400);
  }
  if (file.size > 150 * 1024) {
    throw new AppError('File size must not exceed 150 KB.', 400);
  }

  // Delete previous GridFS file if it exists
  const previousGridfsId = record.contractAgreement?.gridfsId;
  if (previousGridfsId) {
    try { await deleteFromGridFS(previousGridfsId); } catch (e) {
      console.warn('[uploadContractAgreement] Could not delete previous GridFS file:', e.message);
    }
  }

  // Upload to GridFS
  const gridfsResult = await uploadToGridFS(file.buffer, file.originalname, file.mimetype, {
    recordId: record._id.toString(),
    documentType: 'contract-agreement',
    uploadedBy: editorName,
  });

  record.contractAgreement = {
    fileName: file.originalname,
    name: file.originalname,
    fileUrl: '',
    path: '',
    gridfsId: gridfsResult.gridfsId,
    contentType: gridfsResult.contentType,
    fileSize: file.size,
    size: file.size,
    uploadedAt: new Date(),
    uploadedBy: editorName,
  };

  record.updatedBy = editorName;
  record.updatedOn = new Date();

  // Record audit history entry
  record.statusHistory = record.statusHistory || [];
  record.statusHistory.push({
    status: record.status,
    description: `Contract Agreement uploaded: ${file.originalname}`,
    updatedBy: editorName,
    updatedOn: new Date(),
  });

  const saved = await record.save();
  return normalizeReceivedInfoRecord(saved);
};

const uploadMouFile = async (id, file, editorName) => {
  const record = await ReceivedInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }
  ensureIntegerStatus(record);
  if (!file) {
    throw new AppError('Please select a file to upload', 400);
  }
  if (file.size > 150 * 1024) {
    throw new AppError('File size must not exceed 150 KB.', 400);
  }

  // Delete previous GridFS file if it exists
  const previousGridfsId = record.mouFile?.gridfsId;
  if (previousGridfsId) {
    try { await deleteFromGridFS(previousGridfsId); } catch (e) {
      console.warn('[uploadMouFile] Could not delete previous GridFS file:', e.message);
    }
  }

  const fileType = file.mimetype || (file.originalname || '').split('.').pop().toLowerCase();

  // Upload to GridFS
  const gridfsResult = await uploadToGridFS(file.buffer, file.originalname, file.mimetype, {
    recordId: record._id.toString(),
    documentType: 'mou-file',
    uploadedBy: editorName,
  });

  record.mouFile = {
    fileName: file.originalname,
    originalName: file.originalname,
    name: file.originalname,
    fileType: fileType,
    fileUrl: '',
    path: '',
    gridfsId: gridfsResult.gridfsId,
    contentType: gridfsResult.contentType,
    fileSize: file.size,
    size: file.size,
    uploadedAt: new Date(),
    uploadedBy: editorName,
    recordId: record._id,
  };

  record.updatedBy = editorName;
  record.updatedOn = new Date();

  // Record audit history entry
  record.statusHistory = record.statusHistory || [];
  record.statusHistory.push({
    status: record.status,
    description: `MOU File uploaded: ${file.originalname}`,
    updatedBy: editorName,
    updatedOn: new Date(),
  });

  const saved = await record.save();
  return normalizeReceivedInfoRecord(saved);
};

const updateConditions = async (id, payload = {}, editorName) => {
  const record = await ReceivedInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }
  ensureIntegerStatus(record);

  let statusCode = null;

  const rawCrStatus = payload.crStatus !== undefined ? payload.crStatus : payload.riStatus;
  if (rawCrStatus !== undefined && rawCrStatus !== null && rawCrStatus !== '') {
    statusCode = toRiConditionCode(rawCrStatus);
    if (!statusCode && rawCrStatus !== 'NA' && rawCrStatus !== '-') {
      throw new AppError('Invalid CR Status. Value must be an integer between 1 and 11.', 400);
    }
  } else if (false) {
    statusCode = toRiConditionCode(payload.riStatus);
    if (!statusCode && payload.riStatus !== 'NA') {
      throw new AppError('Invalid CR Status. Value must be an integer between 1 and 11.', 400);
    }
  } else if (payload.activeCondition !== undefined && payload.activeCondition !== null) {
    const raw = String(payload.activeCondition).trim();
    if (raw && raw !== 'NA') {
      statusCode = toRiConditionCode(raw);
      if (!statusCode) {
        throw new AppError(`Invalid condition: ${raw}`, 400);
      }
    }
  } else if (payload.conditionsRequired && typeof payload.conditionsRequired === 'object') {
    const trueKeys = Object.entries(payload.conditionsRequired)
      .filter(([k, v]) => Boolean(v) && RI_CONDITION_KEY_TO_CODE[k])
      .map(([k]) => k);

    if (trueKeys.length > 1) {
      throw new AppError('Only one condition can be active at a time.', 400);
    }

    if (trueKeys.length === 1) {
      statusCode = RI_CONDITION_KEY_TO_CODE[trueKeys[0]];
    }
  }

  // Validate On-Hold mandatory deadline date (On-Hold is code 2)
  let deadlineDate = null;
  if (statusCode === 2) {
    if (!payload.onHoldDeadline) {
      throw new AppError('Deadline date is mandatory when On-Hold condition is selected.', 400);
    }
    deadlineDate = new Date(payload.onHoldDeadline);
    if (isNaN(deadlineDate.getTime())) {
      throw new AppError('Please provide a valid deadline date for On-Hold status.', 400);
    }
  }

  // Prepare updated conditionsRequired object (mutually exclusive)
  const updatedConditions = {};
  Object.keys(RI_CONDITION_KEY_TO_CODE).forEach((k) => {
    updatedConditions[k] = statusCode ? RI_CONDITION_KEY_TO_CODE[k] === statusCode : false;
  });

  const activeLabel = statusCode ? getRiConditionLabel(statusCode) : '';

  record.conditionsRequired = updatedConditions;
  record.activeCondition = activeLabel;
  // Strictly store numeric status value (1-11 or null) in database
  record.crStatus = statusCode;
  record.riStatus = statusCode;
  record.onHoldDeadline = deadlineDate;
  record.updatedBy = editorName;
  record.updatedOn = new Date();

  // Record status transition in statusHistory for audit trail visibility
  if (statusCode) {
    record.statusHistory = record.statusHistory || [];
    record.statusHistory.push({
      status: record.status,
      description: `CR Status set to ${activeLabel}`,
      updatedBy: editorName,
      updatedOn: new Date(),
    });
  }

  const saved = await record.save();
  return normalizeReceivedInfoRecord(saved);
};

const updateRemarks = async (id, remarks, editorName) => {
  const record = await ReceivedInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }

  const remarkText = String(remarks !== undefined ? remarks : '').trim();
  record.remarks = remarkText;
  if (remarkText) {
    record.remarksHistory = record.remarksHistory || [];
    record.remarksHistory.push({
      remark: remarkText,
      crStatus: toRiConditionCode(record.crStatus || record.riStatus),
        riStatus: toRiConditionCode(record.crStatus || record.riStatus),
      updatedBy: editorName,
      updatedOn: new Date(),
    });
  }
  record.updatedBy = editorName;
  record.updatedOn = new Date();

  const saved = await record.save();
  return normalizeReceivedInfoRecord(saved);
};

const streamReceivedInfoAuditDocument = async (id, docType, res, { download = false } = {}) => {
  const record = await ReceivedInfo.findById(id).lean();
  if (!record) {
    throw new AppError('Record not found', 404);
  }

  const type = String(docType || '').toLowerCase().replace(/[-_]/g, '');
  let docObj = null;
  let defaultName = 'document';

  if (type === 'proposalrequest' || type === 'clproofdoc') {
    docObj = record.proposalRequest || record.clProofDoc;
    defaultName = 'proposal-request';
  } else if (type === 'contractagreement' || type === 'coverletter') {
    docObj = record.contractAgreement || record.coverLetter;
    defaultName = 'contract-agreement';
  } else if (type === 'moufile' || type === 'clprofiledoc') {
    docObj = record.mouFile || record.clProfileDoc;
    defaultName = 'mou-file';
  } else {
    throw new AppError('Invalid document type requested', 400);
  }

  if (!docObj) {
    throw new AppError(`No ${docType} document found for this record`, 404);
  }

  // ── GridFS path: stream from MongoDB ──
  if (docObj.gridfsId) {
    const filename = docObj.fileName || docObj.originalName || docObj.name || defaultName;
    const mimeType = docObj.contentType || getMimeType(filename, 'application/octet-stream');
    return streamFromGridFS(docObj.gridfsId, filename, mimeType, res, download);
  }

  // ── GridFS metadata lookup fallback (for records uploaded to GridFS but missing gridfsId link) ──
  const gridfsFile = await findGridFSFileByMetadata(record._id.toString(), defaultName);
  if (gridfsFile) {
    // Auto-heal: save the found gridfsId back to the parent record
    const fieldKey = (type === 'proposalrequest' || type === 'clproofdoc') ? 'proposalRequest'
      : (type === 'contractagreement' || type === 'coverletter') ? 'contractAgreement' : 'mouFile';
    await ReceivedInfo.updateOne(
      { _id: record._id },
      { $set: {
        [`${fieldKey}.gridfsId`]: gridfsFile._id,
        [`${fieldKey}.contentType`]: gridfsFile.contentType || '',
      } }
    );
    const filename = docObj.fileName || docObj.originalName || docObj.name || gridfsFile.filename || defaultName;
    const mimeType = gridfsFile.contentType || gridfsFile.metadata?.contentType || getMimeType(filename, 'application/octet-stream');
    return streamFromGridFS(gridfsFile._id, filename, mimeType, res, download);
  }

  // ── Legacy fallback: stream from local filesystem ──
  const storedPath = docObj.path || docObj.fileUrl;
  if (!storedPath) {
    throw new AppError(`No ${docType} document found for this record`, 404);
  }

  const absolutePath = await resolveReceivedInfoAuditDocumentPath(storedPath, {
    id: record._id?.toString(),
    docType,
  });

  if (!absolutePath) {
    throw new AppError('Document file not found on server', 404);
  }

  const ext = path.extname(absolutePath);
  const filename = docObj.fileName || docObj.originalName || docObj.name || `${defaultName}${ext}`;
  const mimeType = getMimeType(filename, docObj.fileType || 'application/octet-stream');

  const stat = fs.statSync(absolutePath);

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', buildContentDisposition(filename, download));
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(absolutePath);
    fileStream.on('error', (streamError) => {
      console.error(`[ReceivedInfoAuditDocument] Failed to read ${docType} document`, {
        id: record._id?.toString(),
        storedPath,
        absolutePath,
        error: streamError.message,
      });
      if (!res.headersSent) {
        reject(new AppError('Failed to read document', 500));
      }
    });
    res.on('finish', resolve);
    res.on('error', reject);
    fileStream.pipe(res);
  });
};

const deleteReceivedInfoAuditDocument = async (id, docType, editorName) => {
  const record = await ReceivedInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }
  ensureIntegerStatus(record);

  // Normalise docType -> field key
  const type = String(docType || '').toLowerCase().replace(/[-_]/g, '');
  let fieldKey = null;
  let docLabel = '';

  if (type === 'proposalrequest' || type === 'clproofdoc') {
    fieldKey = 'proposalRequest';
    docLabel = 'Proposal Request';
  } else if (type === 'contractagreement' || type === 'coverletter') {
    fieldKey = 'contractAgreement';
    docLabel = 'Contract Agreement';
  } else if (type === 'moufile' || type === 'clprofiledoc') {
    fieldKey = 'mouFile';
    docLabel = 'MOU File';
  } else {
    throw new AppError('Invalid document type. Must be proposal-request, contract-agreement, or mou-file.', 400);
  }

  const docObj = record[fieldKey];
  const gridfsId = docObj?.gridfsId;
  const storedPath = docObj?.path || docObj?.fileUrl || '';
  const originalName = docObj?.fileName || docObj?.originalName || docObj?.name || '';

  if (!storedPath && !gridfsId) {
    throw new AppError(`No ${docLabel} document found on this record.`, 404);
  }

  // Delete from GridFS if present
  if (gridfsId) {
    try { await deleteFromGridFS(gridfsId); } catch (e) {
      console.warn(`[deleteReceivedInfoAuditDocument] GridFS delete failed:`, e.message);
    }
  }

  // Also try to delete legacy local file (best-effort)
  if (storedPath) {
    try {
      const absolutePath = await resolveReceivedInfoAuditDocumentPath(storedPath, {
        id: record._id?.toString(),
        docType,
      });
      if (absolutePath) {
        await fs.promises.unlink(absolutePath);
      }
    } catch (unlinkErr) {
      console.warn(`[deleteReceivedInfoAuditDocument] File unlink failed (${unlinkErr.code}), clearing DB record anyway`);
    }
  }

  // Clear the sub-document fields in MongoDB
  if (fieldKey === 'mouFile') {
    const emptyMou = {
      fileName: '', originalName: '', name: '', fileType: '',
      fileUrl: '', path: '', gridfsId: null, contentType: '',
      fileSize: 0, size: 0, uploadedAt: null, uploadedBy: '', recordId: null,
    };
    record.mouFile = emptyMou;
    record.clProfileDoc = emptyMou;
  } else if (fieldKey === 'proposalRequest') {
    const emptyProp = {
      fileName: '', name: '', fileUrl: '', path: '',
      gridfsId: null, contentType: '',
      fileSize: 0, size: 0, uploadedAt: null, uploadedBy: '',
    };
    record.proposalRequest = emptyProp;
    record.clProofDoc = emptyProp;
  } else {
    const emptyContract = {
      fileName: '', name: '', fileUrl: '', path: '',
      gridfsId: null, contentType: '',
      fileSize: 0, size: 0, uploadedAt: null, uploadedBy: '',
    };
    record.contractAgreement = emptyContract;
    record.coverLetter = emptyContract;
  }

  record.updatedBy = editorName;
  record.updatedOn = new Date();

  // Record deletion in audit history
  record.statusHistory = record.statusHistory || [];
  record.statusHistory.push({
    status: record.status,
    description: `${docLabel} document deleted${originalName ? `: ${originalName}` : ''}`,
    updatedBy: editorName,
    updatedOn: new Date(),
  });

  const saved = await record.save();
  return normalizeReceivedInfoRecord(saved);
};

const getReceivedInfoAuditById = async (id) => {
  const record = await ReceivedInfo.findById(id).lean();
  if (!record) {
    throw new AppError('Record not found', 404);
  }
  return normalizeReceivedInfoRecord(record);
};

const getStatusHistory = async (id, { all = false } = {}) => {
  const record = await ReceivedInfo.findById(id).select('statusHistory').lean();
  if (!record) {
    throw new AppError('Record not found', 404);
  }
  const convertStatus = (val) => {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'number' && Number.isInteger(val)) return val;
    if (typeof val === 'string') {
      const parsed = Number(val);
      if (Number.isInteger(parsed)) return parsed;
      return toReceivedInfoStatusCode(val, null);
    }
    return null;
  };
  const history = Array.isArray(record.statusHistory) ? record.statusHistory : [];
  const filtered = all ? history : history.filter(isWorkflowStatusHistory);
  return filtered.map((item) => {
    const itemObj = item.toObject ? item.toObject() : { ...item };
    return {
      ...itemObj,
      _id: itemObj._id ? String(itemObj._id) : undefined,
      id: itemObj._id ? String(itemObj._id) : itemObj.id,
      status: convertStatus(itemObj.status),
    };
  });
};


const deleteStatusHistory = async (id, historyId) => {
  if (!id || !historyId) {
    throw new AppError('Record ID and History ID are required', 400);
  }
  const record = await ReceivedInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }
  const historyIndex = (record.statusHistory || []).findIndex(
    (item, idx) =>
      (item._id && String(item._id) === String(historyId)) ||
      (item.id && String(item.id) === String(historyId)) ||
      (item.updatedOn && String(new Date(item.updatedOn).getTime()) === String(historyId)) ||
      String(idx) === String(historyId)
  );
  if (historyIndex === -1) {
    throw new AppError('Audit history record not found', 404);
  }
  record.statusHistory.splice(historyIndex, 1);
  await record.save();
  return { success: true, message: 'Audit history record deleted successfully.' };
};

module.exports = {
  normalizeReceivedInfoRecord,
  uploadProposalRequest,
  uploadContractAgreement,
  uploadMouFile,
  updateConditions,
  updateRemarks,
  streamReceivedInfoAuditDocument,
  deleteReceivedInfoAuditDocument,
  getReceivedInfoAuditById,
  getStatusHistory,
  deleteStatusHistory,
};