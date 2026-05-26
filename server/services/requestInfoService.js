const RequestInfo = require('../models/RequestInfo');
const AppError = require('../utils/AppError');
const {
  RECRUITMENT_STATUS,
  toRecruitmentStatusCode,
} = require('../utils/statusMaster');

const normalizeRequestRecord = (doc) => {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.status = toRecruitmentStatusCode(obj.status);
  if (Array.isArray(obj.statusHistory)) {
    obj.statusHistory = obj.statusHistory.map((item) => ({
      ...(item.toObject ? item.toObject() : item),
      status: toRecruitmentStatusCode(item.status),
    }));
  }
  return obj;
};

const buildListQuery = ({ search = '', status = '', domain = '', location = '' }) => {
  const query = {};

  if (search) {
    query.$or = [
      { idnumber: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
      { domain: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } },
      { resourcePerson: { $regex: search, $options: 'i' } },
      { contactNumber: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  if (status !== '' && status !== undefined && status !== null) {
    query.status = toRecruitmentStatusCode(status);
  }
  if (domain) query.domain = domain;
  if (location) query.location = location;

  return query;
};

const getRequestInfos = async (queryParams) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status = '',
    domain = '',
    location = '',
    sortBy = 'updatedOn',
    sortOrder = 'desc',
  } = queryParams;

  const query = buildListQuery({ search, status, domain, location });
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

const generateIdNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `EH-${year}-`;
  const regex = new RegExp(`^${prefix}\\d{3}$`);
  const latestRecord = await RequestInfo.findOne({ idnumber: regex }).sort({ idnumber: -1 });

  let nextNumber = 1;
  if (latestRecord) {
    const parts = latestRecord.idnumber.split('-');
    const lastSuffix = parseInt(parts[2], 10);
    if (!Number.isNaN(lastSuffix)) {
      nextNumber = lastSuffix + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
};

const createRequestInfo = async (body, editorName) => {
  const {
    companyName,
    domain,
    location,
    contactNumber,
    resourcePerson,
    portalLink,
    status,
    description = 'Initial record creation',
  } = body;

  const statusCode = toRecruitmentStatusCode(status, RECRUITMENT_STATUS.VERIFIED);
  const idnumber = await generateIdNumber();
  const historyItem = {
    status: statusCode,
    description,
    updatedBy: editorName,
    updatedOn: new Date(),
  };

  const record = await RequestInfo.create({
    idnumber,
    companyName,
    domain,
    location,
    contactNumber,
    resourcePerson,
    portalLink,
    status: statusCode,
    description,
    updatedBy: editorName,
    updatedOn: new Date(),
    statusHistory: [historyItem],
  });

  return normalizeRequestRecord(record);
};

const updateRequestInfo = async (id, body, editorName) => {
  const record = await RequestInfo.findById(id);
  if (!record) {
    throw new AppError('Record not found', 404);
  }

  const { idnumber, companyName, domain, location, contactNumber, resourcePerson, portalLink } = body;

  if (idnumber && idnumber !== record.idnumber) {
    const exists = await RequestInfo.findOne({ idnumber });
    if (exists) {
      throw new AppError('Record with this ID number already exists', 400);
    }
    record.idnumber = idnumber;
  }

  if (companyName !== undefined) record.companyName = companyName;
  if (domain) record.domain = domain;
  if (location) record.location = location;
  if (contactNumber !== undefined) record.contactNumber = contactNumber;
  if (resourcePerson) record.resourcePerson = resourcePerson;
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
