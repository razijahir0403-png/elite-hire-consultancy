const { body, param, query } = require('express-validator');
const { RECRUITMENT_STATUS_MAX } = require('./statusMaster');

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

const optionalContactNumberValidator = (fieldPath = 'contactNumber') =>
  body(fieldPath)
    .optional({ values: 'falsy' })
    .customSanitizer((v) => String(v ?? '').replace(/\D/g, ''))
    .custom((v) => {
      if (!v) return true;
      if (!/^\d{10}$/.test(v)) {
        throw new Error('Mobile number must be exactly 10 digits');
      }
      return true;
    });

const optionalEmailValidator = (fieldPath = 'email') =>
  body(fieldPath)
    .optional({ values: 'falsy' })
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail();

const requestInfoValidators = {
  create: [
    body('idnumber').optional({ values: 'falsy' }).custom((_value, { req }) => {
      if (req.body.idnumber) {
        throw new Error('Record ID is assigned automatically on create');
      }
      return true;
    }),
    body('companyName').trim().notEmpty().withMessage('Company name is required'),
    body('domain').trim().notEmpty().withMessage('Domain is required'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    optionalEmailValidator(),
    optionalContactNumberValidator(),
    body('resourcePerson').optional({ values: 'falsy' }).trim(),
    body('portalLink').optional().trim(),
    body('status')
      .optional()
      .isInt({ min: 0, max: RECRUITMENT_STATUS_MAX })
      .toInt(),
    body('description').optional().trim(),
  ],
  update: [
    param('id').isMongoId().withMessage('Valid record id is required'),
    body('idnumber').optional().trim().notEmpty(),
    body('companyName').optional({ values: 'falsy' }).trim().notEmpty().withMessage('Company name cannot be empty'),
    body('domain').optional({ values: 'falsy' }).trim().notEmpty(),
    body('location').optional({ values: 'falsy' }).trim().notEmpty(),
    optionalEmailValidator(),
    optionalContactNumberValidator(),
    body('resourcePerson').optional({ values: 'falsy' }).trim(),
    body('portalLink').optional({ values: 'falsy' }).trim(),
  ],
  updateStatus: [
    param('id').isMongoId().withMessage('Valid record id is required'),
    body('status')
      .isInt({ min: 0, max: RECRUITMENT_STATUS_MAX })
      .withMessage('Status must be a valid numeric code'),
    body('description').trim().notEmpty().withMessage('Description is required'),
  ],
  idParam: [param('id').isMongoId().withMessage('Valid record id is required')],
  listQuery: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional({ values: 'falsy' })
      .isInt({ min: 0, max: RECRUITMENT_STATUS_MAX })
      .toInt(),
  ],
};

const receivedInfoValidators = {
  create: [
    body('requestId').optional({ values: 'falsy' }).custom((_value, { req }) => {
      if (req.body.requestId) {
        throw new Error('Request ID is assigned automatically on create');
      }
      return true;
    }),
    body('companyName').trim().notEmpty().withMessage('Company name is required'),
    body('domain').trim().notEmpty().withMessage('Domain is required'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    body('resourceName').trim().notEmpty().withMessage('Resource name is required'),
    optionalEmailValidator(),
    optionalContactNumberValidator('mobileNumber'),
    body('vendor')
      .trim()
      .notEmpty()
      .withMessage('Vendor is required')
      .isIn(['HR Circle', 'Talvixa', 'Job Updates', 'RedBus', 'Other Vendor'])
      .withMessage('Invalid vendor selection'),
  ],
  update: [
    param('id').isMongoId().withMessage('Valid record id is required'),
    body('requestId').optional().trim().notEmpty(),
    body('companyName').optional({ values: 'falsy' }).trim().notEmpty().withMessage('Company name cannot be empty'),
    body('domain').optional({ values: 'falsy' }).trim().notEmpty().withMessage('Domain cannot be empty'),
    body('location').optional({ values: 'falsy' }).trim().notEmpty().withMessage('Location cannot be empty'),
    body('resourceName').optional({ values: 'falsy' }).trim().notEmpty().withMessage('Resource name cannot be empty'),
    optionalEmailValidator(),
    optionalContactNumberValidator('mobileNumber'),
    body('vendor')
      .optional()
      .trim()
      .isIn(['HR Circle', 'Talvixa', 'Job Updates', 'RedBus', 'Other Vendor'])
      .withMessage('Invalid vendor selection'),
  ],
  idParam: [param('id').isMongoId().withMessage('Valid record id is required')],
  listQuery: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('vendor')
      .optional({ values: 'falsy' })
      .trim()
      .isIn(['HR Circle', 'Talvixa', 'Job Updates', 'RedBus', 'Other Vendor', ''])
      .withMessage('Invalid vendor selection'),
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
  receivedInfoValidators,
  activityLogValidators,
  userValidators,
};

