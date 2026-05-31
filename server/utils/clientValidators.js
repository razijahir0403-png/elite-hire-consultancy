const { body, param, query } = require('express-validator');
const { CLIENT_STATUS_MAX } = require('./clientStatusMaster');

/** Matches standard text field limits used across RequestInfo / Client string fields. */
const TEXT_FIELD_MAX_LENGTH = 200;

const categoryValidator = (fieldPath = 'category', { required = true } = {}) => {
  const chain = body(fieldPath).trim();
  if (required) {
    chain.notEmpty().withMessage('Category is required');
  } else {
    chain.optional({ values: 'falsy' }).notEmpty().withMessage('Category cannot be empty');
  }
  return chain
    .isLength({ max: TEXT_FIELD_MAX_LENGTH })
    .withMessage(`Category must not exceed ${TEXT_FIELD_MAX_LENGTH} characters`);
};

const optionalMobileValidator = (fieldPath = 'mobile') =>
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

const parseStatusField = body('status')
  .optional({ values: 'falsy' })
  .customSanitizer((v) => (v === '' || v === undefined || v === null ? undefined : Number(v)))
  .isInt({ min: 0, max: CLIENT_STATUS_MAX })
  .withMessage('Status must be a valid numeric code');

const clientValidators = {
  create: [
    body('clientId').optional({ values: 'falsy' }).custom((_value, { req }) => {
      if (req.body.clientId) {
        throw new Error('Client ID is assigned automatically on create');
      }
      return true;
    }),
    body('clientName').trim().notEmpty().withMessage('Client name is required'),
    optionalEmailValidator(),
    optionalMobileValidator(),
    categoryValidator(),
    parseStatusField,
    body('description').optional({ values: 'falsy' }).trim(),
  ],
  update: [
    param('id').isMongoId().withMessage('Valid client id is required'),
    body('clientName').optional({ values: 'falsy' }).trim().notEmpty().withMessage('Client name cannot be empty'),
    optionalEmailValidator(),
    optionalMobileValidator(),
    categoryValidator(),
    body('removeProfileDocument')
      .optional()
      .isIn(['true', 'false', true, false])
      .withMessage('removeProfileDocument must be a boolean'),
  ],
  updateStatus: [
    param('id').isMongoId().withMessage('Valid client id is required'),
    body('status')
      .isInt({ min: 0, max: CLIENT_STATUS_MAX })
      .withMessage('Status must be a valid numeric code'),
    body('description').trim().notEmpty().withMessage('Description is required'),
  ],
  idParam: [param('id').isMongoId().withMessage('Valid client id is required')],
  listQuery: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional({ values: 'falsy' })
      .isInt({ min: 0, max: CLIENT_STATUS_MAX })
      .toInt(),
    query('category').optional({ values: 'falsy' }).trim(),
  ],
};

module.exports = clientValidators;
