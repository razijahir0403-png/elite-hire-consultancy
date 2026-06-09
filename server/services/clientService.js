const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const Client = require('../models/Client');
const AppError = require('../utils/AppError');
const {
  CLIENT_STATUS,
  toClientStatusCode,
} = require('../utils/clientStatusMaster');
const { getAgeDateRange, calculateAgeInDays } = require('../utils/ageFilterHelper');
const {
  generateNextClientId,
  isDuplicateClientIdError,
  MAX_GENERATION_ATTEMPTS,
} = require('../utils/clientIdGenerator');

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
  if (obj._id && obj.profileDocumentPath) {
    obj.profileDocumentUrl = `/api/clients/${obj._id}/document`;
  }
  if (obj._id && obj.proofDocumentPath) {
    obj.proofDocumentUrl = `/api/clients/${obj._id}/proof-document`;
  }
  return obj;
};

const deleteProfileFile = async (relativePath) => {
  if (!relativePath) return;
  const absolutePath = path.join(__dirname, '..', relativePath.replace(/^\//, ''));
  try {
    await fsp.unlink(absolutePath);
  } catch {
    // File may already be removed
  }
};

const applyUploadedDocument = (file) => {
  if (!file) return { path: '', name: '' };
  return {
    path: `/uploads/clients/${file.filename}`,
    name: file.originalname,
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
    Client.find(query).sort(sort).skip(skip).limit(limitNum),
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
  const record = await Client.findById(id);
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
  const proofFile = files?.proofDocument?.[0];
  const profileDocInfo = applyUploadedDocument(profileFile);
  const proofDocInfo = applyUploadedDocument(proofFile);

  const recordPayload = {
    clientName: String(clientName).trim(),
    mobile: mobile || '',
    email: email ? String(email).trim().toLowerCase() : '',
    category: String(category).trim(),
    profileDocumentPath: profileDocInfo.path,
    profileDocumentName: profileDocInfo.name,
    proofDocumentPath: proofDocInfo.path,
    proofDocumentName: proofDocInfo.name,
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
      if (profileDocInfo.path) await deleteProfileFile(profileDocInfo.path);
      if (proofDocInfo.path) await deleteProfileFile(proofDocInfo.path);
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
    const docInfo = applyUploadedDocument(profileFile);
    record.profileDocumentPath = docInfo.path;
    record.profileDocumentName = docInfo.name;
    if (previousPath && previousPath !== docInfo.path) {
      await deleteProfileFile(previousPath);
    }
  } else if (shouldRemoveProfileDoc && record.profileDocumentPath) {
    await deleteProfileFile(record.profileDocumentPath);
    record.profileDocumentPath = '';
    record.profileDocumentName = '';
  }

  if (proofFile) {
    const previousPath = record.proofDocumentPath;
    const docInfo = applyUploadedDocument(proofFile);
    record.proofDocumentPath = docInfo.path;
    record.proofDocumentName = docInfo.name;
    if (previousPath && previousPath !== docInfo.path) {
      await deleteProfileFile(previousPath);
    }
  } else if (shouldRemoveProofDoc && record.proofDocumentPath) {
    await deleteProfileFile(record.proofDocumentPath);
    record.proofDocumentPath = '';
    record.proofDocumentName = '';
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
  };

  record.status = statusCode;
  record.description = description;
  record.updatedBy = editorName;
  record.updatedOn = new Date();
  record.statusHistory.push(historyItem);

  const saved = await record.save();
  return normalizeClientRecord(saved);
};

const getStatusHistory = async (id) => {
  const record = await Client.findById(id).select('statusHistory');
  if (!record) {
    throw new AppError('Client not found', 404);
  }
  return record.statusHistory.map((item) => ({
    ...(item.toObject ? item.toObject() : item),
    status: toClientStatusCode(item.status),
  }));
};

const exportClients = async (queryParams) => {
  const { search = '', status = '', category = '', sortBy = 'updatedOn', sortOrder = 'desc' } =
    queryParams;
  const query = buildListQuery({ search, status, category });
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
  const records = await Client.find(query).sort(sort).limit(5000);
  return records.map(normalizeClientRecord);
};

const resolveProfileDocumentPath = (relativePath) =>
  path.join(__dirname, '..', String(relativePath).replace(/^\//, ''));

const streamClientDocument = async (id, res, { download = false } = {}) => {
  const record = await Client.findById(id);
  if (!record) {
    throw new AppError('Client not found', 404);
  }
  if (!record.profileDocumentPath) {
    throw new AppError('No profile document found for this client', 404);
  }

  const absolutePath = resolveProfileDocumentPath(record.profileDocumentPath);

  try {
    await fsp.access(absolutePath);
  } catch {
    throw new AppError('Profile document file not found on server', 404);
  }

  const filename = record.profileDocumentName || 'profile-document.pdf';
  const safeFilename = filename.replace(/[^\w.\-() ]/g, '_');
  const disposition = download ? 'attachment' : 'inline';

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
  );
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(absolutePath);
    fileStream.on('error', () => {
      if (!res.headersSent) {
        reject(new AppError('Failed to read profile document', 500));
      }
    });
    res.on('finish', resolve);
    res.on('error', reject);
    fileStream.pipe(res);
  });
};

const streamClientProofDocument = async (id, res, { download = false } = {}) => {
  const record = await Client.findById(id);
  if (!record) {
    throw new AppError('Client not found', 404);
  }
  if (!record.proofDocumentPath) {
    throw new AppError('No proof document found for this client', 404);
  }

  const absolutePath = resolveProfileDocumentPath(record.proofDocumentPath);

  try {
    await fsp.access(absolutePath);
  } catch {
    throw new AppError('Proof document file not found on server', 404);
  }

  const filename = record.proofDocumentName || 'proof-document.pdf';
  const safeFilename = filename.replace(/[^\w.\-() ]/g, '_');
  const disposition = download ? 'attachment' : 'inline';

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
  );
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(absolutePath);
    fileStream.on('error', () => {
      if (!res.headersSent) {
        reject(new AppError('Failed to read proof document', 500));
      }
    });
    res.on('finish', resolve);
    res.on('error', reject);
    fileStream.pipe(res);
  });
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
};
