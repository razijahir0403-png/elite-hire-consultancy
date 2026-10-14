const Employee = require('../models/Employee');

const ID_PREFIX = 'EMP';
const SEQUENCE_PAD_LENGTH = 3;
const MAX_GENERATION_ATTEMPTS = 5;

/** Matches EMP001, EMP002, etc. (sequence is 3+ digits) */
const ID_NUMBER_PATTERN = /^EMP(\d+)$/;

const formatEmployeeCode = (sequence) =>
  `${ID_PREFIX}${String(sequence).padStart(SEQUENCE_PAD_LENGTH, '0')}`;

const parseEmployeeCode = (employeeCode) => {
  const match = String(employeeCode || '').match(/^(?:EMP|EHC)(\d+)$/);
  if (!match) return null;
  return {
    sequence: Number(match[1]),
  };
};

/**
 * Highest numeric sequence across all records (including soft-deleted).
 * Aggregate bypasses soft-delete query middleware so occupied IDs are not reused.
 * Matches both EMP and legacy EHC prefixes to ensure seamless sequence continuity.
 */
const getMaxSequenceForEmployee = async () => {
  const [result] = await Employee.aggregate([
    {
      $match: {
        employeeCode: { $regex: '^(?:EMP|EHC)\\d+$' },
      },
    },
    {
      $addFields: {
        sequence: {
          $toInt: {
            $replaceAll: {
              input: {
                $replaceAll: {
                  input: '$employeeCode',
                  find: 'EMP',
                  replacement: '',
                },
              },
              find: 'EHC',
              replacement: '',
            },
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        maxSeq: { $max: '$sequence' },
      },
    },
  ]);

  return result?.maxSeq ?? 0;
};

const generateNextEmployeeCode = async () => {
  const maxSequence = await getMaxSequenceForEmployee();
  return formatEmployeeCode(maxSequence + 1);
};

const isDuplicateKeyError = (err) =>
  err?.code === 11000 && (err?.keyPattern?.employeeCode || err?.keyValue?.employeeCode);

module.exports = {
  ID_PREFIX,
  ID_NUMBER_PATTERN,
  SEQUENCE_PAD_LENGTH,
  MAX_GENERATION_ATTEMPTS,
  formatEmployeeCode,
  parseEmployeeCode,
  getMaxSequenceForEmployee,
  generateNextEmployeeCode,
  isDuplicateKeyError,
};
