const employeeService = require('../services/employeeService');
const asyncHandler = require('../utils/asyncHandler');
const { isUserAdmin } = require('../middleware/authMiddleware');

const getEmployees = asyncHandler(async (req, res) => {
  const isAdmin = isUserAdmin(req.user);
  if (!isAdmin) {
    // Non-admin employees strictly receive only their own employee profile
    const record = await employeeService.getEmployeeByEmail(req.user.email);
    return res.status(200).json({
      success: true,
      data: {
        employees: record ? [record] : [],
        pagination: {
          total: record ? 1 : 0,
          page: 1,
          pages: 1,
          limit: 10,
        },
      },
    });
  }
  const result = await employeeService.getEmployees(req.query);
  res.status(200).json({ success: true, data: result });
});

const getMyProfile = asyncHandler(async (req, res) => {
  const record = await employeeService.getEmployeeByEmail(req.user.email);
  res.status(200).json({ success: true, data: record || null });
});

const getEmployee = asyncHandler(async (req, res) => {
  const record = await employeeService.getEmployeeById(req.params.id);
  res.status(200).json({ success: true, data: record });
});

const createEmployee = asyncHandler(async (req, res) => {
  const record = await employeeService.createEmployee(req.body, req.user.name);
  res.status(201).json({ success: true, data: record });
});

const updateEmployee = asyncHandler(async (req, res) => {
  const record = await employeeService.updateEmployee(req.params.id, req.body, req.user.name);
  res.status(200).json({ success: true, data: record });
});

const deleteEmployee = asyncHandler(async (req, res) => {
  const result = await employeeService.softDeleteEmployee(req.params.id);
  res.status(200).json({ success: true, data: result });
});

module.exports = {
  getEmployees,
  getMyProfile,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};

