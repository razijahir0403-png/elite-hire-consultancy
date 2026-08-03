const employeeService = require('../services/employeeService');
const asyncHandler = require('../utils/asyncHandler');

const getEmployees = asyncHandler(async (req, res) => {
  const result = await employeeService.getEmployees(req.query);
  res.status(200).json({ success: true, data: result });
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
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};
