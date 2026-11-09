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
  RI_CONDITION_KEY_TO_CODE,
  RI_CODE_TO_KEY,
  RI_LABEL_TO_CODE,
  RI_CONDITIONS_LIST,
  toRiConditionCode,
  getRiConditionLabel,
  getRiConditionKey,
} = require('../utils/riStatusMaster');
const { toReceivedInfoStatusCode, ReceivedInfoStatusLabel } = require('../utils/statusMaster');

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
    const base = {
      fileName: docObj.fileName || docObj.name || docObj.originalName || '',
      name: docObj.name || docObj.fileName || docObj.originalName || '',
      originalName: docObj.originalName || docObj.fileName || docObj.name || '',
      fileType: docObj.fileType || '',
      fileUrl: docObj.fileUrl || docObj.path || '',
      path: docObj.path || docObj.fileUrl || '',
      fileSize: docObj.fileSize || docObj.size || 0,
      size: docObj.size || docObj.fileSize || 0,
      uploadedAt: docObj.uploadedAt || null,
      uploadedBy: docObj.uploadedBy || '',
      recordId: docObj.recordId || obj._id || null,
    };
    return base;
  };

  obj.proposalRequest = normDoc(obj.proposalRequest, 'proposal-request');
  obj.contractAgreement = normDoc(obj.contractAgreement, 'contract-agreement');
  obj.mouFile = normDoc(obj.mouFile, 'mou-file');

  // Normalize conditionsRequired
  const riStatusCode = toRiConditionCode(obj.riStatus);
  const conditionsRequired = {};
  Object.keys(RI_CONDITION_KEY_TO_CODE).forEach((k) => {
    conditionsRequired[k] = riStatusCode ? RI_CONDITION_KEY_TO_CODE[k] === riStatusCode : false;
  });
  obj.conditionsRequired = conditionsRequired;
  obj.riStatusCode = riStatusCode;
  obj.riStatus = riStatusCode ? getRiConditionLabel(riStatusCode) : 'NA';
  obj.activeCondition = riStatusCode ? getRiConditionLabel(riStatusCode) : '';
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
  if (file.size > 100 * 1024) {
    throw new AppError('File size must not exceed 100 KB', 400);
  }

  const filePath = `/uploads/received-info-audit/${file.filename}`;
  record.proposalRequest = {
    fileName: file.originalname,
    name: file.originalname,
    fileUrl: filePath,
    path: filePath,
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
  if (file.size > 100 * 1024) {
    throw new AppError('File size must not exceed 100 KB', 400);
  }

  const filePath = `/uploads/received-info-audit/${file.filename}`;
  record.contractAgreement = {
    fileName: file.originalname,
    name: file.originalname,
    fileUrl: filePath,
    path: filePath,
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
  if (file.size > 100 * 1024) {
    throw new AppError('File size must not exceed 100 KB', 400);
  }

  const filePath = `/uploads/received-info-audit/${file.filename}`;
  const fileExt = (file.originalname || '').split('.').pop().toLowerCase();
  const fileType = file.mimetype || fileExt;

  record.mouFile = {
    fileName: file.originalname,
    originalName: file.originalname,
    name: file.originalname,
    fileType: fileType,
    fileUrl: filePath,
    path: filePath,
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

  if (payload.riStatus !== undefined && payload.riStatus !== null && payload.riStatus !== '') {
    statusCode = toRiConditionCode(payload.riStatus);
    if (!statusCode && payload.riStatus !== 'NA') {
      throw new AppError('Invalid RI Status. Value must be an integer between 1 and 11.', 400);
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
  record.riStatus = statusCode;
  record.onHoldDeadline = deadlineDate;
  record.updatedBy = editorName;
  record.updatedOn = new Date();

  // Record status transition in statusHistory for audit trail visibility
  if (statusCode) {
    record.statusHistory = record.statusHistory || [];
    record.statusHistory.push({
      status: record.status,
      description: `RI Condition set to ${activeLabel}`,
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
      riStatus: toRiConditionCode(record.riStatus),
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

  if (type === 'proposalrequest') {
    docObj = record.proposalRequest;
    defaultName = 'proposal-request';
  } else if (type === 'contractagreement') {
    docObj = record.contractAgreement;
    defaultName = 'contract-agreement';
  } else if (type === 'moufile') {
    docObj = record.mouFile;
    defaultName = 'mou-file';
  } else {
    throw new AppError('Invalid document type requested', 400);
  }

  if (!docObj || (!docObj.path && !docObj.fileUrl)) {
    throw new AppError(`No ${docType} document found for this record`, 404);
  }

  const storedPath = docObj.path || docObj.fileUrl;
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
  res.setHeader('Cache-Control', 'private, max-age=3600');
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

  if (type === 'proposalrequest') {
    fieldKey = 'proposalRequest';
    docLabel = 'Proposal Request';
  } else if (type === 'contractagreement') {
    fieldKey = 'contractAgreement';
    docLabel = 'Contract Agreement';
  } else if (type === 'moufile') {
    fieldKey = 'mouFile';
    docLabel = 'MOU File';
  } else {
    throw new AppError('Invalid document type. Must be proposal-request, contract-agreement, or mou-file.', 400);
  }

  const docObj = record[fieldKey];
  const storedPath = docObj?.path || docObj?.fileUrl || '';
  const originalName = docObj?.fileName || docObj?.originalName || docObj?.name || '';

  if (!storedPath) {
    throw new AppError(`No ${docLabel} document found on this record.`, 404);
  }

  // Resolve the absolute path and delete the physical file (best-effort)
  try {
    const absolutePath = await resolveReceivedInfoAuditDocumentPath(storedPath, {
      id: record._id?.toString(),
      docType,
    });
    if (absolutePath) {
      await fs.promises.unlink(absolutePath);
    } else {
      console.warn(`[deleteReceivedInfoAuditDocument] File not found on disk — clearing DB record only`, {
        id,
        docType,
        storedPath,
      });
    }
  } catch (unlinkErr) {
    // Log but do not block DB cleanup — avoids leaving orphan DB references
    console.warn(`[deleteReceivedInfoAuditDocument] File unlink failed (${unlinkErr.code}), clearing DB record anyway`, {
      id,
      docType,
      storedPath,
      error: unlinkErr.message,
    });
  }

  // Clear the sub-document fields in MongoDB
  if (fieldKey === 'mouFile') {
    record[fieldKey] = {
      fileName: '',
      originalName: '',
      name: '',
      fileType: '',
      fileUrl: '',
      path: '',
      fileSize: 0,
      size: 0,
      uploadedAt: null,
      uploadedBy: '',
      recordId: null,
    };
  } else {
    record[fieldKey] = {
      fileName: '',
      name: '',
      fileUrl: '',
      path: '',
      fileSize: 0,
      size: 0,
      uploadedAt: null,
      uploadedBy: '',
    };
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

const getStatusHistory = async (id) => {
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
  return (record.statusHistory || []).map((item) => {
    const itemObj = item.toObject ? item.toObject() : { ...item };
    itemObj.status = convertStatus(itemObj.status);
    return itemObj;
  });
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
};