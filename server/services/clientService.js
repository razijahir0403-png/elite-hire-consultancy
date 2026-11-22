const fs = require('fs');
const fsp = require('fs').promises;
const Client = require('../models/Client');
const AppError = require('../utils/AppError');
const {
  CLIENT_STATUS,
  toClientStatusCode,
  ClientStatusLabel,
} = require('../utils/clientStatusMaster');
const { isWorkflowStatusHistory } = require('../utils/statusMaster');
const { getAgeDateRange, calculateAgeInDays } = require('../utils/ageFilterHelper');
const {
  resolveClientDocumentPath,
  resolveClientDocumentPathSync,
  toStoredDocumentPath,
} = require('../utils/clientDocumentPaths');
const {
  generateNextClientId,
  isDuplicateClientIdError,
  MAX_GENERATION_ATTEMPTS,
} = require('../utils/clientIdGenerator');
const {
  uploadToGridFS,
  streamFromGridFS,
  deleteFromGridFS,
  findGridFSFileByMetadata,
} = require('./gridfsService');

const buildContentDisposition = (filename, download) => {
  const safeFilename = String(filename || 'document.pdf').replace(/[^\w.\-() ]/g, '_');
  const disposition = download ? 'attachment' : 'inline';
  return `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(filename || safeFilename)}`;
};

const streamDocumentFile = async (record, fieldPrefix, res, { download = false } = {}) => {
  const pathField = `${fieldPrefix}DocumentPath`;
  const nameField = `${fieldPrefix}DocumentName`;
  const gridfsIdField = `${fieldPrefix}DocumentGridfsId`;
  const contentTypeField = `${fieldPrefix}DocumentContentType`;
  const label = fieldPrefix === 'profile' ? 'Profile' : 'Proof';
  const defaultName = `${fieldPrefix}-document.pdf`;

  // ── GridFS path ──
  const gridfsId = record[gridfsIdField];
  if (gridfsId) {
    const filename = record[nameField] || defaultName;
    const mimeType = record[contentTypeField] || 'application/pdf';
    return streamFromGridFS(gridfsId, filename, mimeType, res, download);
  }

  // ── GridFS metadata lookup fallback ──
  const gridfsFile = await findGridFSFileByMetadata(
    (record._id || '').toString(),
    fieldPrefix
  );
  if (gridfsFile) {
    // Auto-heal: save the found gridfsId back to the parent record
    await Client.updateOne(
      { _id: record._id },
      { $set: {
        [gridfsIdField]: gridfsFile._id,
        [contentTypeField]: gridfsFile.contentType || 'application/pdf',
      } }
    );
    const filename = record[nameField] || gridfsFile.filename || defaultName;
    const mimeType = gridfsFile.contentType || gridfsFile.metadata?.contentType || 'application/pdf';
    return streamFromGridFS(gridfsFile._id, filename, mimeType, res, download);
  }

  // ── Legacy local filesystem fallback ──
  const storedPath = record[pathField];
  if (!storedPath) {
    throw new AppError(`No ${label.toLowerCase()} document found for this client`, 404);
  }

  const absolutePath = await resolveClientDocumentPath(storedPath, {
    clientId: record.clientId || record._id?.toString(),
    documentType: fieldPrefix,
  });

  if (!absolutePath) {
    throw new AppError(`${label} document file not found on server`, 404);
  }

  const filename = record[nameField] || defaultName;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', buildContentDisposition(filename, download));
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(absolutePath);
    fileStream.on('error', (streamError) => {
      console.error(`[ClientDocument] Failed to read ${label.toLowerCase()} document`, {
        clientId: record.clientId || record._id?.toString(),
        storedPath,
        absolutePath,
        error: streamError.message,
      });
      if (!res.headersSent) {
        reject(new AppError(`Failed to read ${label.toLowerCase()} document`, 500));
      }
    });
    res.on('finish', resolve);
    res.on('error', reject);
    fileStream.pipe(res);
  });
};

const normalizeClientRecord = (doc) => {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.status = toClientStatusCode(obj.status);
  obj.ageInDays = calculateAgeInDays(obj.createdAt);


  obj.createdDate = obj.createdAt;
  obj.updatedDate = obj.updatedOn;
  if (Array.isArray(obj.statusHistory)) {
    obj.statusHistory = obj.statusHistory.map((item) => ({
      ...(item.toObject ? item.toObject() : item),
      status: toClientStatusCode(item.status),
    }));
  }
  if (obj._id && (obj.profileDocumentPath || obj.profileDocumentGridfsId)) {
    obj.profileDocumentUrl = `/api/clients/${obj._id}/document`;
    obj.profileDocumentFileId = obj.profileDocumentGridfsId ? String(obj.profileDocumentGridfsId) : '';
    obj.profileDocumentStorageType = obj.profileDocumentGridfsId ? 'gridfs' : 'local';
  }
  if (obj._id && (obj.proofDocumentPath || obj.proofDocumentGridfsId)) {
    obj.proofDocumentUrl = `/api/clients/${obj._id}/proof-document`;
    obj.proofDocumentFileId = obj.proofDocumentGridfsId ? String(obj.proofDocumentGridfsId) : '';
    obj.proofDocumentStorageType = obj.proofDocumentGridfsId ? 'gridfs' : 'local';
  }

  // Normalize client audit document sub-documents to include gridfs fields
  const auditDocFields = ['clProofDoc', 'coverLetter', 'clProfileDoc'];
  for (const field of auditDocFields) {
    const docObj = obj[field];
    if (docObj && typeof docObj === 'object') {
      const gId = docObj.gridfsId ? String(docObj.gridfsId) : '';
      obj[field] = {
        ...docObj,
        fileId: gId,
        gridfsId: gId,
        storageType: gId ? 'gridfs' : (docObj.fileUrl || docObj.path ? 'local' : ''),
      };
    }
  }
  return obj;
};

const deleteProfileFile = async (relativePath, gridfsId) => {
  // Delete from GridFS if present
  if (gridfsId) {
    try { await deleteFromGridFS(gridfsId); } catch (e) {
      console.warn('[Client] could not delete GridFS file:', e.message);
    }
  }
  // Also try to delete legacy local file
  if (!relativePath) return;
  const absolutePath = resolveClientDocumentPathSync(relativePath);
  if (!absolutePath) return;
  try {
    await fsp.unlink(absolutePath);
  } catch {
    // File may already be removed
  }
};

/**
 * Upload a single client document file to GridFS.
 * Returns { path, name, gridfsId, contentType }
 */
const applyUploadedDocument = async (file, metadata = {}) => {
  if (!file) return { path: '', name: '', gridfsId: null, contentType: '' };
  if (file.size > 150 * 1024) throw new AppError('File size must not exceed 150 KB.', 400);

  const gridfsResult = await uploadToGridFS(file.buffer, file.originalname, file.mimetype, metadata);
  return {
    path: '',
    name: file.originalname,
    gridfsId: gridfsResult.gridfsId,
    contentType: gridfsResult.contentType,
  };
};

const buildListQuery = ({ search = '', status = '', age = '' }) => {
  const query = {};

  if (search) {
    query.$or = [
      { clientId: { $regex: search, $options: 'i' } },
      { clientName: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  if (status !== '' && status !== undefined && status !== null) {
    query.status = toClientStatusCode(status);
  }

  if (age) {
    const ageQuery = getAgeDateRange(age);
    if (ageQuery) {
      query.createdAt = ageQuery;
    }
  }

  return query;
};

const getClients = async (queryParams) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status = '',
    age = '',
    sortBy = 'updatedOn',
    sortOrder = 'desc',
  } = queryParams;

  const query = buildListQuery({ search, status, age });
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [records, totalRecords] = await Promise.all([
    Client.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
    Client.countDocuments(query),
  ]);

  return {
    records: records.map(normalizeClientRecord),
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalRecords / limitNum) || 1,
      totalRecords,
    },
  };
};

const getClientById = async (id) => {
  const record = await Client.findById(id).lean();
  if (!record) {
    throw new AppError('Client not found', 404);
  }
  return normalizeClientRecord(record);
};

const createClient = async (body, files, editorName) => {
  const {
    clientId: _clientId,
    clientName,
    mobile,
    email,
    category,
    status,
    description = 'Initial client record creation',
  } = body;

  const statusCode = toClientStatusCode(status, CLIENT_STATUS.INFO_VERIFIED);
  const profileFile = files?.profileDocument?.[0];
  if (profileFile && profileFile.size > 150 * 1024) throw new AppError('File size must not exceed 150 KB.', 400);
  const proofFile = files?.proofDocument?.[0];
  if (proofFile && proofFile.size > 150 * 1024) throw new AppError('File size must not exceed 150 KB.', 400);

  const profileDocInfo = await applyUploadedDocument(profileFile, { documentType: 'profile', uploadedBy: editorName });
  const proofDocInfo = await applyUploadedDocument(proofFile, { documentType: 'proof', uploadedBy: editorName });

  const recordPayload = {
    clientName: String(clientName).trim(),
    mobile: mobile || '',
    email: email ? String(email).trim().toLowerCase() : '',
    category: String(category).trim(),
    profileDocumentPath: profileDocInfo.path,
    profileDocumentName: profileDocInfo.name,
    profileDocumentGridfsId: profileDocInfo.gridfsId,
    profileDocumentContentType: profileDocInfo.contentType,
    proofDocumentPath: proofDocInfo.path,
    proofDocumentName: proofDocInfo.name,
    proofDocumentGridfsId: proofDocInfo.gridfsId,
    proofDocumentContentType: proofDocInfo.contentType,
    status: statusCode,
    description,
    createdBy: editorName,
    updatedBy: editorName,
    updatedOn: new Date(),
    statusHistory: [
      {
        status: statusCode,
        description,
        updatedBy: editorName,
        updatedOn: new Date(),
        eventType: 'workflow_status',
      },
    ],
  };

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const clientId = await generateNextClientId();
    try {
      const record = await Client.create({ clientId, ...recordPayload });
      return normalizeClientRecord(record);
    } catch (err) {
      if (isDuplicateClientIdError(err)) {
        console.warn(
          `[Client] Duplicate clientId "${clientId}" on create (attempt ${attempt}/${MAX_GENERATION_ATTEMPTS}). Retrying.`
        );
        if (attempt === MAX_GENERATION_ATTEMPTS) {
          throw new AppError(
            'Unable to assign a unique client ID after multiple attempts. Please try again.',
            409
          );
        }
        continue;
      }
      if (profileDocInfo.gridfsId) await deleteFromGridFS(profileDocInfo.gridfsId).catch(() => {});
      if (proofDocInfo.gridfsId) await deleteFromGridFS(proofDocInfo.gridfsId).catch(() => {});
      throw err;
    }
  }

  throw new AppError('Unable to assign a unique client ID. Please try again.', 409);
};

const updateClient = async (id, body, files, editorName) => {
  const record = await Client.findById(id);
  if (!record) {
    throw new AppError('Client not found', 404);
  }

  const { clientName, mobile, email, category, removeProfileDocument, removeProofDocument } = body;

  if (clientName !== undefined) record.clientName = String(clientName).trim();
  if (mobile !== undefined) record.mobile = mobile || '';
  if (email !== undefined) record.email = email ? String(email).trim().toLowerCase() : '';
  if (category !== undefined) record.category = String(category).trim();

  const shouldRemoveProfileDoc = removeProfileDocument === true || removeProfileDocument === 'true';
  const shouldRemoveProofDoc = removeProofDocument === true || removeProofDocument === 'true';

  const profileFile = files?.profileDocument?.[0];
  const proofFile = files?.proofDocument?.[0];

  if (profileFile) {
    const previousPath = record.profileDocumentPath;
    const previousGridfsId = record.profileDocumentGridfsId;
    const docInfo = await applyUploadedDocument(profileFile, { documentType: 'profile', uploadedBy: editorName });
    record.profileDocumentPath = docInfo.path;
    record.profileDocumentName = docInfo.name;
    record.profileDocumentGridfsId = docInfo.gridfsId;
    record.profileDocumentContentType = docInfo.contentType;
    if (previousGridfsId || previousPath) {
      await deleteProfileFile(previousPath, previousGridfsId);
    }
  } else if (shouldRemoveProfileDoc && (record.profileDocumentPath || record.profileDocumentGridfsId)) {
    await deleteProfileFile(record.profileDocumentPath, record.profileDocumentGridfsId);
    record.profileDocumentPath = '';
    record.profileDocumentName = '';
    record.profileDocumentGridfsId = null;
    record.profileDocumentContentType = '';
  }

  if (proofFile) {
    const previousPath = record.proofDocumentPath;
    const previousGridfsId = record.proofDocumentGridfsId;
    const docInfo = await applyUploadedDocument(proofFile, { documentType: 'proof', uploadedBy: editorName });
    record.proofDocumentPath = docInfo.path;
    record.proofDocumentName = docInfo.name;
    record.proofDocumentGridfsId = docInfo.gridfsId;
    record.proofDocumentContentType = docInfo.contentType;
    if (previousGridfsId || previousPath) {
      await deleteProfileFile(previousPath, previousGridfsId);
    }
  } else if (shouldRemoveProofDoc && (record.proofDocumentPath || record.proofDocumentGridfsId)) {
    await deleteProfileFile(record.proofDocumentPath, record.proofDocumentGridfsId);
    record.proofDocumentPath = '';
    record.proofDocumentName = '';
    record.proofDocumentGridfsId = null;
    record.proofDocumentContentType = '';
  }

  record.updatedBy = editorName;
  record.updatedOn = new Date();

  const saved = await record.save();
  return normalizeClientRecord(saved);
};

const softDeleteClient = async (id) => {
  const record = await Client.findById(id);
  if (!record) {
    throw new AppError('Client not found', 404);
  }
  await record.softDelete();
  return { message: 'Client removed successfully' };
};

const updateClientStatus = async (id, { status, description }, editorName) => {
  const record = await Client.findById(id);
  if (!record) {
    throw new AppError('Client not found', 404);
  }

  const statusCode = toClientStatusCode(status);
  const historyItem = {
    status: statusCode,
    description,
    updatedBy: editorName,
    updatedOn: new Date(),
    eventType: 'workflow_status',
  };

  record.status = statusCode;
  record.description = description;
  record.updatedBy = editorName;
  record.updatedOn = new Date();
  record.statusHistory.push(historyItem);

  const saved = await record.save();
  return normalizeClientRecord(saved);
};

const getStatusHistory = async (id, { all = false } = {}) => {
  const record = await Client.findById(id).select('statusHistory').lean();
  if (!record) {
    throw new AppError('Client not found', 404);
  }
  const history = Array.isArray(record.statusHistory) ? record.statusHistory : [];
  const filtered = all ? history : history.filter(isWorkflowStatusHistory);
  const mapped = filtered.map((item) => {
    const raw = item.toObject ? item.toObject() : { ...item };
    const statusCode = toClientStatusCode(raw.status);
    return {
      ...raw,
      _id: raw._id ? String(raw._id) : undefined,
      id: raw._id ? String(raw._id) : raw.id,
      status: statusCode,
      statusLabel: ClientStatusLabel[statusCode] || 'Unknown',
    };
  });
  mapped.sort((a, b) => new Date(b.updatedOn || 0) - new Date(a.updatedOn || 0));
  return mapped;
};

const exportClients = async (queryParams) => {
  const { search = '', status = '', category = '', sortBy = 'updatedOn', sortOrder = 'desc' } =
    queryParams;
  const query = buildListQuery({ search, status, category });
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
  const records = await Client.find(query).sort(sort).limit(5000).lean();
  return records.map(normalizeClientRecord);
};

const streamClientDocument = async (id, res, { download = false } = {}) => {
  const record = await Client.findById(id).lean();
  if (!record) {
    throw new AppError('Client not found', 404);
  }
  return streamDocumentFile(record, 'profile', res, { download });
};

const streamClientProofDocument = async (id, res, { download = false } = {}) => {
  const record = await Client.findById(id).lean();
  if (!record) {
    throw new AppError('Client not found', 404);
  }
  return streamDocumentFile(record, 'proof', res, { download });
};


// ============================================================
// CLIENT AUDIT DOCUMENT METHODS (CL Proof Doc / Cover Letter / CL Profile Doc)
// ============================================================
const { resolveClientAuditDocumentPath, buildContentDisposition: buildAuditContentDisposition, getMimeType, toStoredClientAuditPath } = require('../utils/clientAuditDocumentPaths');

const DOC_FIELD_MAP = {
  'cl-proof-doc': 'clProofDoc',
  'cover-letter': 'coverLetter',
  'cl-profile-doc': 'clProfileDoc',
};

const uploadClientAuditDocument = async (id, docType, file, editorName) => {
  const fieldName = DOC_FIELD_MAP[docType];
  if (!fieldName) throw new AppError('Invalid document type', 400);
  const record = await Client.findById(id);
  if (!record) throw new AppError('Client not found', 404);
  if (!file) throw new AppError('No file uploaded', 400);
  if (file.size > 150 * 1024) throw new AppError('File size must not exceed 150 KB.', 400);

  // Delete old GridFS file if exists
  const oldDoc = record[fieldName];
  if (oldDoc && oldDoc.gridfsId) {
    try { await deleteFromGridFS(oldDoc.gridfsId); } catch (e) {
      console.warn('[ClientAudit] could not delete old GridFS file:', e.message);
    }
  }

  // Upload to GridFS
  const gridfsResult = await uploadToGridFS(file.buffer, file.originalname, file.mimetype, {
    recordId: record._id.toString(),
    documentType: docType,
    uploadedBy: editorName,
  });

  record[fieldName] = {
    fileName: file.originalname,
    fileUrl: '',
    path: '',
    gridfsId: gridfsResult.gridfsId,
    contentType: gridfsResult.contentType,
    fileSize: file.size,
    uploadedAt: new Date(),
    uploadedBy: editorName,
  };
  if (!Array.isArray(record.statusHistory)) record.statusHistory = [];
  record.statusHistory.push({
    status: record.status,
    description: `${docType} document uploaded: ${file.originalname}`,
    eventType: 'document_upload',
    updatedBy: editorName,
    updatedOn: new Date(),
  });
  record.updatedBy = editorName;
  record.updatedOn = new Date();
  const saved = await record.save();
  return normalizeClientRecord(saved);
};

const streamClientAuditDocument = async (id, docType, res, options = {}) => {
  const fieldName = DOC_FIELD_MAP[docType];
  if (!fieldName) throw new AppError('Invalid document type', 400);
  const record = await Client.findById(id).lean();
  if (!record) throw new AppError('Client not found', 404);
  const doc = record[fieldName];
  if (!doc) throw new AppError('No document uploaded for this type', 404);

  const download = options.download === true;

  // ── GridFS path ──
  if (doc.gridfsId) {
    const filename = doc.fileName || docType;
    const mimeType = doc.contentType || getMimeType(filename);
    return streamFromGridFS(doc.gridfsId, filename, mimeType, res, download);
  }

  // ── GridFS metadata lookup fallback ──
  const gridfsFile = await findGridFSFileByMetadata(
    (record._id || '').toString(),
    docType
  );
  if (gridfsFile) {
    // Auto-heal: save the found gridfsId back to the parent record
    await Client.updateOne(
      { _id: record._id },
      { $set: {
        [`${fieldName}.gridfsId`]: gridfsFile._id,
        [`${fieldName}.contentType`]: gridfsFile.contentType || '',
      } }
    );
    const filename = doc.fileName || gridfsFile.filename || docType;
    const mimeType = gridfsFile.contentType || gridfsFile.metadata?.contentType || getMimeType(filename);
    return streamFromGridFS(gridfsFile._id, filename, mimeType, res, download);
  }

  // ── Legacy local filesystem fallback ──
  const storedPath = doc.path || doc.fileUrl;
  if (!storedPath) throw new AppError('No document uploaded for this type', 404);

  const resolved = await resolveClientAuditDocumentPath(storedPath, { id, docType });
  if (!resolved) throw new AppError('Document file not found on server', 404);
  const filename = doc.fileName || path.basename(storedPath);
  const stat = fs.statSync(resolved);
  res.set('Content-Disposition', buildAuditContentDisposition(filename, download));
  res.set('Content-Type', getMimeType(filename));
  res.set('Content-Length', stat.size);
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  res.set('X-Content-Type-Options', 'nosniff');
  const stream = fs.createReadStream(resolved);
  stream.on('error', (err) => {
    console.error('[ClientAudit] stream error', err);
    if (!res.headersSent) res.status(500).json({ message: 'Failed to stream document' });
  });
  stream.pipe(res);
};

const deleteClientAuditDocument = async (id, docType, editorName) => {
  const fieldName = DOC_FIELD_MAP[docType];
  if (!fieldName) throw new AppError('Invalid document type', 400);
  const record = await Client.findById(id);
  if (!record) throw new AppError('Client not found', 404);
  const doc = record[fieldName];
  if (!doc || (!doc.path && !doc.fileUrl && !doc.gridfsId)) throw new AppError('No document found for this type', 404);

  // Delete from GridFS
  if (doc.gridfsId) {
    try { await deleteFromGridFS(doc.gridfsId); } catch (e) {
      console.warn('[ClientAudit] could not delete GridFS file:', e.message);
    }
  }

  // Also try to delete legacy local file
  const storedPath = doc.path || doc.fileUrl;
  if (storedPath) {
    const resolved = await resolveClientAuditDocumentPath(storedPath, { id, docType });
    if (resolved) { try { fs.unlinkSync(resolved); } catch (e) { console.warn('[ClientAudit] could not delete file:', e.message); } }
  }

  const docName = doc.fileName || docType;
  record[fieldName] = null;
  if (!Array.isArray(record.statusHistory)) record.statusHistory = [];
  record.statusHistory.push({
    status: record.status,
    description: `${docType} document deleted: ${docName}`,
    eventType: 'document_delete',
    updatedBy: editorName,
    updatedOn: new Date(),
  });
  record.updatedBy = editorName;
  record.updatedOn = new Date();
  const saved = await record.save();
  return normalizeClientRecord(saved);
};

const updateClientConditions = async (id, body, editorName) => {
  const record = await Client.findById(id);
  if (!record) throw new AppError('Client not found', 404);
  const { crStatus, activeCondition, onHoldDeadline } = body;
  const code = crStatus != null ? Number(crStatus) : null;
  record.crStatus = code;
  record.activeCondition = activeCondition || null;
  record.onHoldDeadline = onHoldDeadline ? new Date(onHoldDeadline) : null;
  if (!Array.isArray(record.statusHistory)) record.statusHistory = [];
  const condLabel = activeCondition || (code ? 'Condition #' + code : 'None');
  record.statusHistory.push({
    status: record.status,
    description: 'Conditions Required updated: ' + condLabel,
    eventType: 'condition_update',
    updatedBy: editorName,
    updatedOn: new Date(),
  });
  record.updatedBy = editorName;
  record.updatedOn = new Date();
  const saved = await record.save();
  return normalizeClientRecord(saved);
};

const updateClientRemarks = async (id, remarks, editorName) => {
  const record = await Client.findById(id);
  if (!record) throw new AppError('Client not found', 404);
  if (!Array.isArray(record.remarksHistory)) record.remarksHistory = [];
  if (record.remarks) {
    record.remarksHistory.push({ remark: record.remarks, updatedBy: record.updatedBy || editorName, updatedOn: record.updatedOn || new Date() });
  }
  record.remarks = remarks || '';
  if (!Array.isArray(record.statusHistory)) record.statusHistory = [];
  record.statusHistory.push({ status: record.status, description: 'Remarks updated', updatedBy: editorName, updatedOn: new Date(), eventType: 'remark_update' });
  record.updatedBy = editorName;
  record.updatedOn = new Date();
  const saved = await record.save();
  return normalizeClientRecord(saved);
};


const deleteStatusHistory = async (id, historyId) => {
  if (!id || !historyId) {
    throw new AppError('Client ID and History ID are required', 400);
  }
  const record = await Client.findById(id);
  if (!record) {
    throw new AppError('Client not found', 404);
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
  getClients,
  getClientById,
  createClient,
  updateClient,
  softDeleteClient,
  updateClientStatus,
  getStatusHistory,
  exportClients,
  streamClientDocument,
  streamClientProofDocument,
  uploadClientAuditDocument,
  streamClientAuditDocument,
  deleteClientAuditDocument,
  updateClientConditions,
  updateClientRemarks,
  deleteStatusHistory,
};

