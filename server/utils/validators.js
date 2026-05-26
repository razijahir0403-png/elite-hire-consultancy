const { body, param, query } = require('express-validator');

const authValidators = {
  register: [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  login: [
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
};

const roleValidators = {
  create: [
    body('name').trim().notEmpty().withMessage('Role name is required'),
    body('description').optional().trim(),
    body('permissions').optional().isArray().withMessage('Permissions must be an array'),
  ],
  update: [
    param('id').isMongoId().withMessage('Valid role id is required'),
    body('name').optional().trim().notEmpty().withMessage('Role name cannot be empty'),
    body('description').optional().trim(),
    body('permissions').optional().isArray().withMessage('Permissions must be an array'),
  ],
  idParam: [param('id').isMongoId().withMessage('Valid role id is required')],
};

const contactNumberValidator = (fieldPath = 'contactNumber') =>
  body(fieldPath)
    .customSanitizer((v) => String(v ?? '').replace(/\D/g, ''))
    .notEmpty()
    .withMessage('Mobile number is required')
    .matches(/^\d{10}$/)
    .withMessage('Mobile number must be exactly 10 digits');

const requestInfoValidators = {
  create: [
    body('companyName').trim().notEmpty().withMessage('Company name is required'),
    body('domain').trim().notEmpty().withMessage('Domain is required'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    contactNumberValidator(),
    body('resourcePerson').trim().notEmpty().withMessage('Resource person is required'),
    body('portalLink').optional().trim(),
    body('status').optional().isInt({ min: 0, max: 16 }).toInt(),
    body('description').optional().trim(),
  ],
  update: [
    param('id').isMongoId().withMessage('Valid record id is required'),
    body('idnumber').optional().trim().notEmpty(),
    body('companyName').optional({ values: 'falsy' }).trim().notEmpty().withMessage('Company name cannot be empty'),
    body('domain').optional({ values: 'falsy' }).trim().notEmpty(),
    body('location').optional({ values: 'falsy' }).trim().notEmpty(),
    body('contactNumber')
      .optional({ values: 'falsy' })
      .customSanitizer((v) => String(v ?? '').replace(/\D/g, ''))
      .matches(/^\d{10}$/)
      .withMessage('Mobile number must be exactly 10 digits'),
    body('resourcePerson').optional({ values: 'falsy' }).trim().notEmpty(),
    body('portalLink').optional({ values: 'falsy' }).trim(),
  ],
  updateStatus: [
    param('id').isMongoId().withMessage('Valid record id is required'),
    body('status').isInt({ min: 0, max: 16 }).withMessage('Status must be a valid numeric code'),
    body('description').trim().notEmpty().withMessage('Description is required'),
  ],
  idParam: [param('id').isMongoId().withMessage('Valid record id is required')],
  listQuery: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional({ values: 'falsy' }).isInt({ min: 0, max: 16 }).toInt(),
  ],
};

const activityLogValidators = {
  create: [
    body('action').trim().notEmpty().withMessage('Action is required'),
    body('resourceType').optional().trim(),
    body('resourceId').optional().trim(),
    body('details').optional(),
  ],
  idParam: [param('id').isMongoId().withMessage('Valid activity log id is required')],
};

const userValidators = {
  approveUser: [
    param('id').isMongoId().withMessage('Valid user id is required'),
    body('isApproved').optional().isBoolean().withMessage('isApproved must be a boolean'),
  ],
  update: [
    param('id').isMongoId().withMessage('Valid user id is required'),
    body('name').optional().trim().notEmpty(),
    body('email').optional().trim().isEmail(),
    body('isApproved').optional().isBoolean(),
    body('role').optional().isMongoId(),
  ],
  idParam: [param('id').isMongoId().withMessage('Valid user id is required')],
};

module.exports = {
  authValidators,
  roleValidators,
  requestInfoValidators,
  activityLogValidators,
  userValidators,
};
