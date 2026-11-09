const ReceivedInfo = require('../models/ReceivedInfo');
const AppError = require('../utils/AppError');
const {
  generateNextRequestId,
  isDuplicateKeyError,
  MAX_GENERATION_ATTEMPTS,
} = require('../utils/receivedIdGenerator');
const { getAgeDateRange, calculateAgeInDays } = require('../utils/ageFilterHelper');
const { toReceivedInfoStatusCode, ReceivedInfoStatusLabel } = require('../utils/statusMaster');

const normalizeReceivedRecord = (doc) => {
  if (!doc) return doc;
  const data = doc.toObject ? doc.toObject() : { ...doc };
  const obj = { ...data };
  obj.id = obj._id;

  // Convert status fields to integer (handles both new integer and legacy string values)
  const convertStatus = (val) => {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'number' && Number.isInteger(val)) return val;
    if (typeof val === 'string') {
      const parsed = Number(val);
      if (Number.isInteger(parsed)) return parsed;
      // Convert legacy string label to integer
      return toReceivedInfoStatusCode(val, null);
    }
    return null;
  };

  const resolvedStatus = convertStatus(obj.status) || convertStatus(obj.currentStatus) || convertStatus(obj.initialStatus);
  obj.status = resolvedStatus;
  obj.currentStatus = resolvedStatus;
  obj.initialStatus = convertStatus(obj.initialStatus) || (Array.isArray(obj.statusHistory) && obj.statusHistory[0]?.status ? convertStatus(obj.statusHistory[0].status) : null) || resolvedStatus;
  obj.ageInDays = calculateAgeInDays(obj.createdAt);

  if (Array.isArray(obj.statusHistory)) {
    obj.statusHistory = obj.statusHistory.map((item) => {
      const itemObj = item.toObject ? item.toObject() : { ...item };
      itemObj.status = convertStatus(itemObj.status);
      return itemObj;
    });
  } else {
    obj.statusHistory = [];
  }
  return obj;
};

const buildListQuery = ({ search = '', vendor = '', domain = '', location = '', age = '' }) => {
  const query = {};

  if (search) {
    query.$or = [
      { requestId: { $regex: search, $options: 'i' } },
      { domain: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } },
      { resourceName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { mobileNumber: { $regex: search, $options: 'i' } },
      { vendor: { $regex: search, $options: 'i' } },
      { status: { $regex: search, $options: 'i' } },
    ];
  }

  if (vendor) query.vendor = vendor;
  if (location) query.location = location;

  if (age) {
    const ageQuery = getAgeDateRange(age);
    if (ageQuery) {
      query.createdAt = ageQuery;
    }
  }

  return query;
};

const getReceivedInfos = async (queryParams) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    vendor = '',
    location = '',
    age = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = queryParams;

  const query = buildListQuery({ search, vendor, location, age });
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [records, totalRecords] = await Promise.all([
    ReceivedInfo.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
    ReceivedInfo.countDocuments(query),
  ]);

  return {
    records: records.map(normalizeReceivedRecord),
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalRecords / limitNum) || 1,
      totalRecords,
    },
  };
};

const getReceivedInfoById = async (id) => {
  const record = await ReceivedInfo.findById(id).lean();
  if (!record) {
    throw new AppError('Record not found', 404);
  }
  return normalizeReceivedRecord(record);
};

const createReceivedInfo = async (body, editorName) => {
  const {
    companyName,
    domain,
    location,
    email,
    mobileNumber,
    resourceName,
    vendor,
    logDescription,
    status,
    initialStatus,
  } = body;

  // Convert status to integer (handles both integer and legacy string label)
  const selectedStatusRaw = status || initialStatus || 'New Info';
  const selectedStatus = toReceivedInfoStatusCode(selectedStatusRaw);
  const descriptionText = logDescription ? String(logDescription).trim() : 'Initial status';

  const historyItem = {
    status: selectedStatus,
    description: descriptionText,
    updatedBy: editorName,
    updatedOn: new Date(),
  };

  const recordPayload = {
    companyName,
    domain,
    location,
    email: email ? String(email).trim().toLowerCase() : '',
    mobileNumber: mobileNumber || '',
    resourceName: resourceName ? String(resourceName).trim() : '',
    vendor,
    logDescription: logDescription ? String(logDescription).trim() : '',
    status: selectedStatus,
    initialStatus: selectedStatus,
    currentStatus: selectedStatus,
    statusHistory: [historyItem],
    updatedBy: editorName,
    updatedOn: new Date(),
  };

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const requestId = await generateNextRequestId();
    try {
      const record = await ReceivedInfo.create({ requestId, ...recordPayload });
      return normalizeReceivedRecord(record);
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        console.warn(
          `[ReceivedInfo] Duplicate requestId "${requestId}" on create (attempt ${attempt}/${MAX_GENERATION_ATTEMPTS}). Retrying with next sequence.`
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

const updateReceivedInfo = async (id, body, editorName) => {
  const record = await ReceivedInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }

  const {
    requestId,
    companyName,
    domain,
    location,
    email,
    mobileNumber,
    resourceName,
    vendor,
    logDescription,
    status,
    initialStatus,
  } = body;

  if (requestId && requestId !== record.requestId) {
    const exists = await ReceivedInfo.findOne({ requestId }).lean();
    if (exists) {
      throw new AppError('Record with this ID already exists', 400);
    }
    record.requestId = requestId;
  }

  if (companyName !== undefined) record.companyName = companyName;
  if (domain !== undefined) record.domain = domain;
  if (location !== undefined) record.location = location;
  if (email !== undefined) record.email = email ? String(email).trim().toLowerCase() : '';
  if (mobileNumber !== undefined) record.mobileNumber = mobileNumber || '';
  if (resourceName !== undefined) record.resourceName = resourceName ? String(resourceName).trim() : '';
  if (vendor !== undefined) record.vendor = vendor;
  if (logDescription !== undefined) record.logDescription = logDescription ? String(logDescription).trim() : '';

  const newStatusRaw = status !== undefined ? status : initialStatus;
  if (newStatusRaw !== undefined && newStatusRaw !== record.status) {
    const newStatus = toReceivedInfoStatusCode(newStatusRaw);
    const oldStatus = record.status || record.currentStatus;
    record.status = newStatus;
    record.currentStatus = newStatus;

    if (!Array.isArray(record.statusHistory)) {
      record.statusHistory = [];
    }

    if (record.statusHistory.length === 0 && oldStatus !== null && oldStatus !== undefined) {
      record.statusHistory.push({
        status: oldStatus,
        description: 'Initial status',
        updatedBy: record.updatedBy || editorName,
        updatedOn: record.createdAt || new Date(),
      });
    }

    record.statusHistory.push({
      status: newStatus,
      description: logDescription ? String(logDescription).trim() : `Status updated to ${ReceivedInfoStatusLabel[newStatus] || newStatus}`,
      updatedBy: editorName,
      updatedOn: new Date(),
    });
  }

  record.updatedBy = editorName;
  record.updatedOn = new Date();

  const saved = await record.save();
  return normalizeReceivedRecord(saved);
};

const softDeleteReceivedInfo = async (id) => {
  const record = await ReceivedInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }
  await record.softDelete();
  return { message: 'Record removed successfully' };
};

const updateReceivedStatus = async (id, body, editorName) => {
  const record = await ReceivedInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }

  const { status, description } = body;

  if (status === undefined || status === null || status === '') {
    throw new AppError('Please provide a status', 400);
  }

  // Convert to integer using centralized helper (handles both integer and legacy string)
  const statusInt = toReceivedInfoStatusCode(status);
  if (!Number.isInteger(statusInt) || statusInt < 1 || statusInt > 15) {
    throw new AppError('Invalid status. Must be an integer between 1 and 15.', 400);
  }

  const oldStatus = record.status || record.currentStatus;
  record.status = statusInt;
  record.currentStatus = statusInt;

  if (!Array.isArray(record.statusHistory)) {
    record.statusHistory = [];
  }

  if (record.statusHistory.length === 0 && oldStatus !== null && oldStatus !== undefined) {
    record.statusHistory.push({
      status: oldStatus,
      description: 'Initial status',
      updatedBy: record.updatedBy || editorName,
      updatedOn: record.createdAt || new Date(),
    });
  }

  record.statusHistory.push({
    status: statusInt,
    description: description ? String(description).trim() : `Status updated to ${ReceivedInfoStatusLabel[statusInt] || statusInt}`,
    updatedBy: editorName,
    updatedOn: new Date(),
  });

  record.updatedBy = editorName;
  record.updatedOn = new Date();

  const saved = await record.save();
  return normalizeReceivedRecord(saved);
};

const getStatusHistory = async (id) => {
  const record = await ReceivedInfo.findById(id).lean();
  if (!record) {
    throw new AppError('Record not found', 404);
  }
  const history = Array.isArray(record.statusHistory) ? record.statusHistory : [];
  if (history.length === 0 && (record.status || record.currentStatus || record.initialStatus)) {
    const currentSt = record.status || record.currentStatus || record.initialStatus;
    return [{
      status: toReceivedInfoStatusCode(currentSt),
      description: record.logDescription || 'Initial status',
      updatedBy: record.updatedBy || 'System',
      updatedOn: record.createdAt || record.updatedOn || new Date(),
    }];
  }
  // Normalize history statuses to integers
  return history.map((item) => ({
    ...item,
    status: toReceivedInfoStatusCode(item.status),
  }));
};

module.exports = {
  getReceivedInfos,
  getReceivedInfoById,
  createReceivedInfo,
  updateReceivedInfo,
  softDeleteReceivedInfo,
  updateReceivedStatus,
  getStatusHistory,
};
