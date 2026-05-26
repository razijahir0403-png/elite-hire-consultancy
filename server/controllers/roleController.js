const roleService = require('../services/roleService');
const asyncHandler = require('../utils/asyncHandler');

const getRoles = asyncHandler(async (req, res) => {
  const roles = await roleService.getRoles();
  res.json(roles);
});

const getRole = asyncHandler(async (req, res) => {
  const role = await roleService.getRoleById(req.params.id);
  res.json(role);
});

const createRole = asyncHandler(async (req, res) => {
  const role = await roleService.createRole(req.body);
  res.status(201).json(role);
});

const updateRole = asyncHandler(async (req, res) => {
  const role = await roleService.updateRole(req.params.id, req.body);
  res.json(role);
});

const deleteRole = asyncHandler(async (req, res) => {
  await roleService.softDeleteRole(req.params.id);
  res.json({ message: 'Role archived successfully (soft delete)' });
});

module.exports = {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
};
