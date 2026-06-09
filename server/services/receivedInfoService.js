const ReceivedInfo = require('../models/ReceivedInfo');
const AppError = require('../utils/AppError');
const {
  generateNextRequestId,
  isDuplicateKeyError,
  MAX_GENERATION_ATTEMPTS,
} = require('../utils/receivedIdGenerator');
const { getAgeDateRange, calculateAgeInDays } = require('../utils/ageFilterHelper');

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
    ReceivedInfo.find(query).sort(sort).skip(skip).limit(limitNum),
    ReceivedInfo.countDocuments(query),
  ]);

  return {
    records: records.map(record => {
      const obj = record.toObject ? record.toObject() : { ...record };
      obj.ageInDays = calculateAgeInDays(obj.createdAt);
      return obj;
    }),
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalRecords / limitNum) || 1,
      totalRecords,
    },
  };
};

const getReceivedInfoById = async (id) => {
  const record = await ReceivedInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }
  return record;
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
  } = body;

  const recordPayload = {
    companyName,
    domain,
    location,
    email: email ? String(email).trim().toLowerCase() : '',
    mobileNumber: mobileNumber || '',
    resourceName: resourceName ? String(resourceName).trim() : '',
    vendor,
    updatedBy: editorName,
    updatedOn: new Date(),
  };

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const requestId = await generateNextRequestId();
    try {
      const record = await ReceivedInfo.create({ requestId, ...recordPayload });
      return record;
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
  } = body;

  if (requestId && requestId !== record.requestId) {
    const exists = await ReceivedInfo.findOne({ requestId });
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

  record.updatedBy = editorName;
  record.updatedOn = new Date();

  const saved = await record.save();
  return saved;
};

const softDeleteReceivedInfo = async (id) => {
  const record = await ReceivedInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }
  await record.softDelete();
  return { message: 'Record removed successfully' };
};

module.exports = {
  getReceivedInfos,
  getReceivedInfoById,
  createReceivedInfo,
  updateReceivedInfo,
  softDeleteReceivedInfo,
};
