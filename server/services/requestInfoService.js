const RequestInfo = require('../models/RequestInfo');
const AppError = require('../utils/AppError');
const {
  RECRUITMENT_STATUS,
  toRecruitmentStatusCode,
} = require('../utils/statusMaster');
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
    RequestInfo.find(query).sort(sort).skip(skip).limit(limitNum),
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
  const record = await RequestInfo.findById(id);
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
    const exists = await RequestInfo.findOne({ idnumber });
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
  const record = await RequestInfo.findById(id).select('statusHistory');
  if (!record) {
    throw new AppError('Record not found', 404);
  }
  return record.statusHistory.map((item) => ({
    ...(item.toObject ? item.toObject() : item),
    status: toRecruitmentStatusCode(item.status),
  }));
};

module.exports = {
  getRequestInfos,
  getRequestInfoById,
  createRequestInfo,
  updateRequestInfo,
  softDeleteRequestInfo,
  updateRequestStatus,
  getStatusHistory,
};
