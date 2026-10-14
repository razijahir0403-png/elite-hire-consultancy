const Employee = require('../models/Employee');
const AppError = require('../utils/AppError');
const {
  generateNextEmployeeCode,
  isDuplicateKeyError,
  MAX_GENERATION_ATTEMPTS,
} = require('../utils/employeeCodeGenerator');

const getEmployees = async (query) => {
  const { search, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;
  
  const filter = {};

  if (search) {
    filter.$or = [
      { employeeCode: { $regex: search, $options: 'i' } },
      { employeeName: { $regex: search, $options: 'i' } },
      { contactNumber: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { domain: { $regex: search, $options: 'i' } },
      { bloodGroup: { $regex: search, $options: 'i' } },
      { aadhaarNumber: { $regex: search, $options: 'i' } },
      { panNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNumber = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  const skip = (pageNumber - 1) * pageSize;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(pageSize)
      .lean(),
    Employee.countDocuments(filter),
  ]);

  return {
    employees,
    pagination: {
      total,
      page: pageNumber,
      pages: Math.ceil(total / pageSize),
      limit: pageSize,
    },
  };
};

const getEmployeeById = async (id) => {
  const employee = await Employee.findById(id).lean();
  if (!employee) {
    throw new AppError('Employee not found', 404);
  }
  return employee;
};

const createEmployee = async (recordPayload, userName) => {
  const sanitizedPayload = { ...recordPayload };
  if (sanitizedPayload.aadhaarNumber !== undefined) {
    sanitizedPayload.aadhaarNumber = String(sanitizedPayload.aadhaarNumber || '').replace(/\D/g, '').slice(0, 12);
  }
  if (sanitizedPayload.panNumber !== undefined) {
    sanitizedPayload.panNumber = String(sanitizedPayload.panNumber || '').trim().toUpperCase().slice(0, 10);
  }

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const employeeCode = await generateNextEmployeeCode();
    
    try {
      const record = await Employee.create({ 
        employeeCode, 
        ...sanitizedPayload, 
        createdBy: userName, 
        updatedBy: userName 
      });
      return record;
    } catch (error) {
      if (isDuplicateKeyError(error) && attempt < MAX_GENERATION_ATTEMPTS) {
        console.warn(`[Employee] Duplicate employeeCode "${employeeCode}" on create (attempt ${attempt}/${MAX_GENERATION_ATTEMPTS}). Retrying...`);
        continue;
      }
      if (isDuplicateKeyError(error)) {
        throw new AppError('Failed to generate a unique Employee Code after multiple attempts. Please try again.', 409);
      }
      throw error;
    }
  }
};

const updateEmployee = async (id, payload, userName) => {
  const employee = await Employee.findById(id);

  if (!employee) {
    throw new AppError('Employee not found', 404);
  }

  // Prevent updating employeeCode
  if (payload.employeeCode && payload.employeeCode !== employee.employeeCode) {
    throw new AppError('Employee Code cannot be modified', 400);
  }

  // Update fields
  const allowedFields = [
    'employeeName',
    'dob',
    'bloodGroup',
    'aadhaarNumber',
    'panNumber',
    'contactNumber',
    'email',
    'homeAddress',
    'domain'
  ];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      if (field === 'aadhaarNumber') {
        employee[field] = String(payload[field] || '').replace(/\D/g, '').slice(0, 12);
      } else if (field === 'panNumber') {
        employee[field] = String(payload[field] || '').trim().toUpperCase().slice(0, 10);
      } else {
        employee[field] = payload[field];
      }
    }
  });

  employee.updatedBy = userName;
  await employee.save();

  return employee;
};

const softDeleteEmployee = async (id) => {
  const employee = await Employee.findById(id);

  if (!employee) {
    throw new AppError('Employee not found', 404);
  }

  await employee.softDelete();
  return { message: 'Employee deleted successfully' };
};

const getEmployeeByEmail = async (email) => {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  const employee = await Employee.findOne({
    email: normalized,
  }).lean();
  if (employee) return employee;

  return Employee.findOne({
    email: { $regex: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  }).lean();
};

module.exports = {
  getEmployees,
  getEmployeeById,
  getEmployeeByEmail,
  createEmployee,
  updateEmployee,
  softDeleteEmployee,
};

