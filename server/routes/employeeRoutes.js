const express = require('express');
const {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employeeController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { employeeValidators } = require('../utils/validators');

const router = express.Router();

// All employee routes are strictly admin-only
router.use(protect, adminOnly);

router
  .route('/')
  .get(employeeValidators.listQuery, validate, getEmployees)
  .post(employeeValidators.create, validate, createEmployee);

router
  .route('/:id')
  .get(employeeValidators.idParam, validate, getEmployee)
  .put(employeeValidators.update, validate, updateEmployee)
  .delete(employeeValidators.idParam, validate, deleteEmployee);

module.exports = router;
