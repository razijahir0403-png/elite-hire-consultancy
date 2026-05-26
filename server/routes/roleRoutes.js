const express = require('express');
const router = express.Router();
const {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
} = require('../controllers/roleController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { roleValidators } = require('../utils/validators');
const validate = require('../middleware/validate');

router.use(protect, adminOnly);

router.route('/')
  .get(getRoles)
  .post(roleValidators.create, validate, createRole);

router.route('/:id')
  .get(roleValidators.idParam, validate, getRole)
  .put(roleValidators.update, validate, updateRole)
  .delete(roleValidators.idParam, validate, deleteRole);

module.exports = router;
