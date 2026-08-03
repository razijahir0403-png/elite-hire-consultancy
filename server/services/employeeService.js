const Employee = require('../models/Employee');
const AppError = require('../utils/AppError');
const {
  generateNextEmployeeCode,
  isDuplicateKeyError,
  MAX_GENERATION_ATTEMPTS,
} = require('../utils/employeeCodeGenerator');

const getEmployees = async (query) => {
  const { search, page = 1, limit = 10 } = query;
  
  const filter = {};

  if (search) {
    filter.$or = [
      { employeeCode: { $regex: search, $options: 'i' } },
      { employeeName: { $regex: search, $options: 'i' } },
      { contactNumber: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { domain: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNumber = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  const skip = (pageNumber - 1) * pageSize;

  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .sort({ createdAt: -1 })
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
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const employeeCode = await generateNextEmployeeCode();
    
    try {
      const record = await Employee.create({ 
        employeeCode, 
        ...recordPayload, 
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
    'contactNumber',
    'email',
    'homeAddress',
    'domain'
  ];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      employee[field] = payload[field];
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

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  softDeleteEmployee,
};
