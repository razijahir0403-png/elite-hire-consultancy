const User = require('../models/User');
const AppError = require('../utils/AppError');

const getUsers = async () => {
  return User.find().select('-password').populate('role', 'name permissions').sort({ createdAt: -1 });
};

const getUserById = async (id) => {
  const user = await User.findById(id).select('-password').populate('role', 'name permissions');
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
};

const updateUser = async (id, data, requesterEmail) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.email === 'admin@elitehire.com' && data.isApproved === false) {
    throw new AppError('Cannot change approval status of master administrator.', 400);
  }

  if (data.name) user.name = data.name;
  if (data.email) user.email = data.email;
  if (data.isApproved !== undefined) user.isApproved = data.isApproved;
  if (data.role !== undefined) user.role = data.role;

  return user.save();
};

const approveUser = async (id, isApproved) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.email === 'admin@elitehire.com') {
    throw new AppError('Cannot change approval status of master administrator.', 400);
  }

  user.isApproved = isApproved === undefined ? true : isApproved;
  await user.save();

  return {
    message: `User ${user.name} has been ${user.isApproved ? 'approved' : 'revoked'}.`,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      isApproved: user.isApproved,
    },
  };
};

const softDeleteUser = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.email === 'admin@elitehire.com') {
    throw new AppError('Cannot delete master administrator account', 400);
  }

  return user.softDelete();
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  approveUser,
  softDeleteUser,
};
