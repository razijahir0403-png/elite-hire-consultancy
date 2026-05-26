const Role = require('../models/Role');
const AppError = require('../utils/AppError');

const getRoles = async () => {
  return Role.find().sort({ createdAt: -1 });
};

const getRoleById = async (id) => {
  const role = await Role.findById(id);
  if (!role) {
    throw new AppError('Role not found', 404);
  }
  return role;
};

const createRole = async (data) => {
  const existing = await Role.findOne({ name: data.name.toLowerCase() });
  if (existing) {
    throw new AppError('Role with this name already exists', 400);
  }
  return Role.create({
    ...data,
    name: data.name.toLowerCase(),
  });
};

const updateRole = async (id, data) => {
  const role = await Role.findById(id);
  if (!role) {
    throw new AppError('Role not found', 404);
  }

  if (data.name && data.name.toLowerCase() !== role.name) {
    const duplicate = await Role.findOne({ name: data.name.toLowerCase() });
    if (duplicate) {
      throw new AppError('Role with this name already exists', 400);
    }
    role.name = data.name.toLowerCase();
  }

  if (data.description !== undefined) role.description = data.description;
  if (data.permissions !== undefined) role.permissions = data.permissions;

  return role.save();
};

const softDeleteRole = async (id) => {
  const role = await Role.findById(id);
  if (!role) {
    throw new AppError('Role not found', 404);
  }
  return role.softDelete();
};

module.exports = {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  softDeleteRole,
};
