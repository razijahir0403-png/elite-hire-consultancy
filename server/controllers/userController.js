const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await userService.getUsers();
  res.json(users);
});

const getUser = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.json(user);
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user.email);
  res.json(user);
});

const approveUser = asyncHandler(async (req, res) => {
  const result = await userService.approveUser(req.params.id, req.body.isApproved);
  res.json(result);
});

const deleteUser = asyncHandler(async (req, res) => {
  await userService.softDeleteUser(req.params.id);
  res.json({ message: 'User archived successfully (soft delete)' });
});

module.exports = {
  getAllUsers,
  getUser,
  updateUser,
  approveUser,
  deleteUser,
};
