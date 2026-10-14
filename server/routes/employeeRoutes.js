const express = require('express');
const {
  getEmployees,
  getMyProfile,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employeeController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { employeeValidators } = require('../utils/validators');

const router = express.Router();

// All employee routes require authentication
router.use(protect);

// Current user profile endpoint
router.get('/me', getMyProfile);

router
  .route('/')
  .get(employeeValidators.listQuery, validate, getEmployees)
  .post(adminOnly, employeeValidators.create, validate, createEmployee);

router
  .route('/:id')
  .get(adminOnly, employeeValidators.idParam, validate, getEmployee)
  .put(adminOnly, employeeValidators.update, validate, updateEmployee)
  .delete(adminOnly, employeeValidators.idParam, validate, deleteEmployee);

module.exports = router;

