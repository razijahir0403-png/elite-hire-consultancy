const RequestInfo = require('../models/RequestInfo');
const AppError = require('../utils/AppError');
const {
  RECRUITMENT_STATUS,
  toRecruitmentStatusCode,
} = require('../utils/statusMaster');
const {
  CR_STATUS,
  CR_STATUS_MAP,
  CR_KEY_TO_CODE,
  CR_CODE_TO_KEY,
  CR_LABEL_TO_CODE,
  CR_STATUS_OPTIONS,
  toCrStatusCode,
  getCrStatusLabel,
  getCrStatusKey,
} = require('../utils/crStatusMaster');
const {
  generateNextIdNumber,
  isDuplicateKeyError,
  MAX_GENERATION_ATTEMPTS,
} = require('../utils/idNumberGenerator');
const { getAgeDateRange, calculateAgeInDays } = require('../utils/ageFilterHelper');

const normalizeRequestRecord = (doc) => {
  if (!doc) return doc;
  const data = doc.toObject ? doc.toObject() : { ...doc };
  const obj = { ...data };
  obj.id = obj._id;
  obj.status = toRecruitmentStatusCode(obj.status);
  obj.ageInDays = calculateAgeInDays(obj.createdAt);

  if (Array.isArray(obj.statusHistory)) {
    obj.statusHistory = obj.statusHistory.map((item) => ({
      ...(item.toObject ? item.toObject() : item),
      status: toRecruitmentStatusCode(item.status),
    }));
  }

  // Derive numeric status code (1-10 or null)
  let crStatusCode = toCrStatusCode(obj.crStatus);
  if (!crStatusCode && obj.activeCondition) {
    crStatusCode = toCrStatusCode(obj.activeCondition);
  }
  if (!crStatusCode && obj.conditionsRequired && typeof obj.conditionsRequired === 'object') {
    const trueKey = Object.keys(CR_KEY_TO_CODE).find((k) => Boolean(obj.conditionsRequired[k]));
    if (trueKey) {
      crStatusCode = CR_KEY_TO_CODE[trueKey];
    }
  }

  // Synchronize conditionsRequired with single active condition (mutually exclusive)
  const conditionsRequired = {};
  Object.keys(CR_KEY_TO_CODE).forEach((k) => {
    conditionsRequired[k] = crStatusCode ? CR_KEY_TO_CODE[k] === crStatusCode : false;
  });
  obj.conditionsRequired = conditionsRequired;

  // Stored numeric status is converted to corresponding status name for UI display
  obj.crStatusCode = crStatusCode; // 1-10 or null
  obj.crStatus = crStatusCode ? getCrStatusLabel(crStatusCode) : 'NA'; // Human-readable label (never raw number in UI)
  obj.activeCondition = crStatusCode ? getCrStatusLabel(crStatusCode) : '';
  obj.onHoldDeadline = obj.onHoldDeadline || null;

  obj.remarks = obj.remarks || '';
  obj.remarksHistory = Array.isArray(obj.remarksHistory) ? obj.remarksHistory : [];
  const reqLet = obj.requestLetter || {};
  obj.requestLetter = {
    fileName: reqLet.fileName || reqLet.name || '',
    name: reqLet.name || reqLet.fileName || '',
    fileUrl: reqLet.fileUrl || reqLet.path || '',
    path: reqLet.path || reqLet.fileUrl || '',
    fileSize: reqLet.fileSize || reqLet.size || 0,
    size: reqLet.size || reqLet.fileSize || 0,
    uploadedAt: reqLet.uploadedAt || null,
    uploadedBy: reqLet.uploadedBy || '',
  };

  const urlLet = obj.urlLetter || {};
  obj.urlLetter = {
    fileName: urlLet.fileName || urlLet.name || '',
    name: urlLet.name || urlLet.fileName || '',
    fileUrl: urlLet.fileUrl || urlLet.path || '',
    path: urlLet.path || urlLet.fileUrl || '',
    fileSize: urlLet.fileSize || urlLet.size || 0,
    size: urlLet.size || urlLet.fileSize || 0,
    uploadedAt: urlLet.uploadedAt || null,
    uploadedBy: urlLet.uploadedBy || '',
  };

  const compProf = obj.companyProfile || {};
  obj.companyProfile = {
    fileName: compProf.fileName || compProf.originalName || compProf.name || '',
    originalName: compProf.originalName || compProf.fileName || compProf.name || '',
    name: compProf.name || compProf.fileName || compProf.originalName || '',
    fileType: compProf.fileType || '',
    fileUrl: compProf.fileUrl || compProf.path || '',
    path: compProf.path || compProf.fileUrl || '',
    fileSize: compProf.fileSize || compProf.size || 0,
    size: compProf.size || compProf.fileSize || 0,
    uploadedAt: compProf.uploadedAt || null,
    uploadedBy: compProf.uploadedBy || '',
    recordId: compProf.recordId || obj._id || null,
  };

  return obj;
};

const buildListQuery = ({ search = '', status = '', domain = '', location = '', age = '' }) => {
  const query = {};

  if (search) {
    query.$or = [
      { idnumber: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
      { domain: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } },
      { resourcePerson: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { contactNumber: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  if (status !== '' && status !== undefined && status !== null) {
    query.status = toRecruitmentStatusCode(status);
  }
  if (location) query.location = location;

  if (age) {
    const ageQuery = getAgeDateRange(age);
    if (ageQuery) {
      query.createdAt = ageQuery;
    }
  }

  return query;
};

const getRequestInfos = async (queryParams) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status = '',
    location = '',
    age = '',
    sortBy = 'updatedOn',
    sortOrder = 'desc',
  } = queryParams;

  const query = buildListQuery({ search, status, location, age });
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [records, totalRecords] = await Promise.all([
    RequestInfo.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
    RequestInfo.countDocuments(query),
  ]);

  return {
    records: records.map(normalizeRequestRecord),
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalRecords / limitNum) || 1,
      totalRecords,
    },
  };
};

const getRequestInfoById = async (id) => {
  const record = await RequestInfo.findById(id).lean();
  if (!record) {
    throw new AppError('Record not found', 404);
  }
  return normalizeRequestRecord(record);
};

const createRequestInfo = async (body, editorName) => {
  const {
    idnumber: _clientId,
    companyName,
    domain,
    location,
    email,
    contactNumber,
    resourcePerson,
    portalLink,
    status,
    description = 'Initial record creation',
  } = body;

  const statusCode = toRecruitmentStatusCode(status, RECRUITMENT_STATUS.VERIFIED);
  const historyItem = {
    status: statusCode,
    description,
    updatedBy: editorName,
    updatedOn: new Date(),
  };

  const duplicate = await RequestInfo.findOne({
    companyName: new RegExp(`^${companyName.trim()}$`, 'i'),
    domain: new RegExp(`^${domain.trim()}$`, 'i'),
  });
  if (duplicate) {
    throw new AppError('A record with this Company Name and Domain already exists.', 409);
  }

  const recordPayload = {
    companyName,
    domain,
    location,
    email: email ? String(email).trim().toLowerCase() : '',
    contactNumber: contactNumber || '',
    resourcePerson: resourcePerson ? String(resourcePerson).trim() : '',
    portalLink,
    status: statusCode,
    description,
    updatedBy: editorName,
    updatedOn: new Date(),
    statusHistory: [historyItem],
  };

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const idnumber = await generateNextIdNumber();
    try {
      const record = await RequestInfo.create({ idnumber, ...recordPayload });
      return normalizeRequestRecord(record);
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        console.warn(
          `[RequestInfo] Duplicate idnumber "${idnumber}" on create (attempt ${attempt}/${MAX_GENERATION_ATTEMPTS}). Retrying with next sequence.`
        );
        if (attempt === MAX_GENERATION_ATTEMPTS) {
          throw new AppError(
            'Unable to assign a unique record ID after multiple attempts. Please try again.',
            409
          );
        }
        continue;
      }
      throw err;
    }
  }

  throw new AppError('Unable to assign a unique record ID. Please try again.', 409);
};

const updateRequestInfo = async (id, body, editorName) => {
  const record = await RequestInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }

  const {
    idnumber,
    companyName,
    domain,
    location,
    email,
    contactNumber,
    resourcePerson,
    portalLink,
  } = body;

  if (idnumber && idnumber !== record.idnumber) {
    const exists = await RequestInfo.findOne({ idnumber }).lean();
    if (exists) {
      throw new AppError('Record with this ID number already exists', 400);
    }
    record.idnumber = idnumber;
  }

  if (companyName !== undefined || domain !== undefined) {
    const newCompanyName = companyName !== undefined ? companyName : record.companyName;
    const newDomain = domain !== undefined ? domain : record.domain;

    const duplicate = await RequestInfo.findOne({
      _id: { $ne: id },
      companyName: new RegExp(`^${newCompanyName.trim()}$`, 'i'),
      domain: new RegExp(`^${newDomain.trim()}$`, 'i'),
    });

    if (duplicate) {
      throw new AppError('A record with this Company Name and Domain already exists.', 409);
    }
  }

  if (companyName !== undefined) record.companyName = companyName;
  if (domain) record.domain = domain;
  if (location) record.location = location;
  if (email !== undefined) record.email = email ? String(email).trim().toLowerCase() : '';
  if (contactNumber !== undefined) record.contactNumber = contactNumber || '';
  if (resourcePerson !== undefined) record.resourcePerson = resourcePerson ? String(resourcePerson).trim() : '';
  if (portalLink !== undefined) record.portalLink = portalLink;
  if (body.crStatus !== undefined) record.crStatus = String(body.crStatus).trim();
  if (body.remarks !== undefined) record.remarks = String(body.remarks).trim();

  record.updatedBy = editorName;
  record.updatedOn = new Date();

  const saved = await record.save();
  return normalizeRequestRecord(saved);
};

const softDeleteRequestInfo = async (id) => {
  const record = await RequestInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }
  await record.softDelete();
  return { message: 'Record removed successfully' };
};

const updateRequestStatus = async (id, { status, description }, editorName) => {
  const record = await RequestInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }

  const statusCode = toRecruitmentStatusCode(status);
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
  return normalizeRequestRecord(saved);
};

const getStatusHistory = async (id) => {
  const record = await RequestInfo.findById(id).select('statusHistory').lean();
  if (!record) {
    throw new AppError('Record not found', 404);
  }
  return (record.statusHistory || []).map((item) => ({
    ...(item.toObject ? item.toObject() : item),
    status: toRecruitmentStatusCode(item.status),
  }));
};

const uploadRequestLetter = async (id, file, editorName) => {
  const record = await RequestInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }
  if (!file) {
    throw new AppError('Please select a file to upload', 400);
  }
  if (file.size > 100 * 1024) {
    throw new AppError('File size must not exceed 100 KB', 400);
  }

  const filePath = `/uploads/analytics/${file.filename}`;
  record.requestLetter = {
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
    status: record.status || 0,
    description: `Request Letter uploaded: ${file.originalname}`,
    updatedBy: editorName,
    updatedOn: new Date(),
  });

  const saved = await record.save();
  return normalizeRequestRecord(saved);
};

const uploadUrlLetter = async (id, file, editorName) => {
  const record = await RequestInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }
  if (!file) {
    throw new AppError('Please select a file to upload', 400);
  }
  if (file.size > 100 * 1024) {
    throw new AppError('File size must not exceed 100 KB', 400);
  }

  const filePath = `/uploads/analytics/${file.filename}`;
  record.urlLetter = {
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
    status: record.status || 0,
    description: `URL Letter uploaded: ${file.originalname}`,
    updatedBy: editorName,
    updatedOn: new Date(),
  });

  const saved = await record.save();
  return normalizeRequestRecord(saved);
};

const uploadCompanyProfile = async (id, file, editorName) => {
  const record = await RequestInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }
  if (!file) {
    throw new AppError('Please select a file to upload', 400);
  }
  if (file.size > 100 * 1024) {
    throw new AppError('File size must not exceed 100 KB', 400);
  }

  const filePath = `/uploads/analytics/${file.filename}`;
  const fileExt = (file.originalname || '').split('.').pop().toLowerCase();
  const fileType = file.mimetype || fileExt;

  record.companyProfile = {
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
    status: record.status || 0,
    description: `Company Profile document uploaded: ${file.originalname}`,
    updatedBy: editorName,
    updatedOn: new Date(),
  });

  const saved = await record.save();
  return normalizeRequestRecord(saved);
};

const updateConditions = async (id, payload = {}, editorName) => {
  const record = await RequestInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }

  let statusCode = null;

  if (payload.crStatus !== undefined && payload.crStatus !== null && payload.crStatus !== '') {
    statusCode = toCrStatusCode(payload.crStatus);
    if (!statusCode && payload.crStatus !== 'NA') {
      throw new AppError('Invalid CR Status. Value must be an integer between 1 and 10.', 400);
    }
  } else if (payload.activeCondition !== undefined && payload.activeCondition !== null) {
    const raw = String(payload.activeCondition).trim();
    if (raw && raw !== 'NA') {
      statusCode = toCrStatusCode(raw);
      if (!statusCode) {
        throw new AppError(`Invalid condition: ${raw}`, 400);
      }
    }
  } else if (payload.conditionsRequired && typeof payload.conditionsRequired === 'object') {
    const trueKeys = Object.entries(payload.conditionsRequired)
      .filter(([k, v]) => Boolean(v) && CR_KEY_TO_CODE[k])
      .map(([k]) => k);

    if (trueKeys.length > 1) {
      throw new AppError('Only one condition can be active at a time.', 400);
    }

    if (trueKeys.length === 1) {
      statusCode = CR_KEY_TO_CODE[trueKeys[0]];
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
  Object.keys(CR_KEY_TO_CODE).forEach((k) => {
    updatedConditions[k] = statusCode ? CR_KEY_TO_CODE[k] === statusCode : false;
  });

  const activeLabel = statusCode ? getCrStatusLabel(statusCode) : '';

  record.conditionsRequired = updatedConditions;
  record.activeCondition = activeLabel;
  // Strictly store numeric status value (1-10 or null) in database
  record.crStatus = statusCode;
  record.onHoldDeadline = deadlineDate;
  record.updatedBy = editorName;
  record.updatedOn = new Date();

  const saved = await record.save();
  return normalizeRequestRecord(saved);
};

const updateRemarks = async (id, remarks, editorName) => {
  const record = await RequestInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }

  const remarkText = String(remarks !== undefined ? remarks : '').trim();
  record.remarks = remarkText;
  if (remarkText) {
    record.remarksHistory = record.remarksHistory || [];
    record.remarksHistory.push({
      remark: remarkText,
      crStatus: toCrStatusCode(record.crStatus),
      updatedBy: editorName,
      updatedOn: new Date(),
    });
  }
  record.updatedBy = editorName;
  record.updatedOn = new Date();

  const saved = await record.save();
  return normalizeRequestRecord(saved);
};

const updateCrStatus = async (id, payload, editorName, file) => {
  const record = await RequestInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }

  let rawStatus;
  let remarkText;

  if (typeof payload === 'object' && payload !== null) {
    rawStatus = payload.crStatus !== undefined ? payload.crStatus : payload.status;
    remarkText = payload.remarks !== undefined ? payload.remarks : payload.description;
  } else {
    rawStatus = payload;
  }

  let statusCode = null;
  if (rawStatus !== undefined && rawStatus !== null && rawStatus !== '') {
    statusCode = toCrStatusCode(rawStatus);
    if (!statusCode && rawStatus !== 'NA') {
      throw new AppError('CR Status must be an integer between 1 and 10.', 400);
    }
  }

  const activeLabel = statusCode ? getCrStatusLabel(statusCode) : '';

  // Store numeric status value (1-10 or null) in database
  record.crStatus = statusCode;
  record.activeCondition = activeLabel;

  // Synchronize conditionsRequired
  const updatedConditions = {};
  Object.keys(CR_KEY_TO_CODE).forEach((k) => {
    updatedConditions[k] = statusCode ? CR_KEY_TO_CODE[k] === statusCode : false;
  });
  record.conditionsRequired = updatedConditions;

  // Store remarks if provided
  if (remarkText !== undefined && remarkText !== null) {
    const trimmed = String(remarkText).trim();
    record.remarks = trimmed;
    if (trimmed) {
      record.remarksHistory = record.remarksHistory || [];
      record.remarksHistory.push({
        remark: trimmed,
        crStatus: statusCode,
        updatedBy: editorName,
        updatedOn: new Date(),
      });
    }
  }

  // Record status transition in statusHistory for audit trail visibility
  if (statusCode) {
    record.statusHistory = record.statusHistory || [];
    record.statusHistory.push({
      status: record.status || 0,
      description: `CR Status set to ${activeLabel}${remarkText ? ': ' + String(remarkText).trim() : ''}`,
      updatedBy: editorName,
      updatedOn: new Date(),
    });
  }

  record.updatedBy = editorName;
  record.updatedOn = new Date();

  const saved = await record.save();
  return normalizeRequestRecord(saved);
};

module.exports = {
  getRequestInfos,
  getRequestInfoById,
  createRequestInfo,
  updateRequestInfo,
  softDeleteRequestInfo,
  updateRequestStatus,
  getStatusHistory,
  uploadRequestLetter,
  uploadUrlLetter,
  uploadCompanyProfile,
  updateConditions,
  updateRemarks,
  updateCrStatus,
};
