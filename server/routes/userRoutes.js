const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUser,
  updateUser,
  approveUser,
  deleteUser,
} = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { userValidators } = require('../utils/validators');
const validate = require('../middleware/validate');

router.use(protect, adminOnly);

router.route('/')
  .get(getAllUsers);

router.route('/:id')
  .get(userValidators.idParam, validate, getUser)
  .put(userValidators.update, validate, updateUser)
  .delete(userValidators.idParam, validate, deleteUser);

router.put('/:id/approve', userValidators.approveUser, validate, approveUser);

module.exports = router;
