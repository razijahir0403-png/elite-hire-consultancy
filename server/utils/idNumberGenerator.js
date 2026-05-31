const RequestInfo = require('../models/RequestInfo');

const ID_PREFIX = 'EH';
const SEQUENCE_PAD_LENGTH = 3;
const MAX_GENERATION_ATTEMPTS = 5;

/** Matches EH-YYYY-XXX (sequence is 3+ digits when sequence exceeds 999). */
const ID_NUMBER_PATTERN = /^EH-(\d{4})-(\d+)$/;

const formatRequestId = (year, sequence) =>
  `${ID_PREFIX}-${year}-${String(sequence).padStart(SEQUENCE_PAD_LENGTH, '0')}`;

const parseRequestId = (idnumber) => {
  const match = String(idnumber || '').match(ID_NUMBER_PATTERN);
  if (!match) return null;
  return {
    year: Number(match[1]),
    sequence: Number(match[2]),
  };
};

/**
 * Highest numeric sequence for the year across all records (including soft-deleted).
 * Aggregate bypasses soft-delete query middleware so occupied IDs are not reused.
 */
const getMaxSequenceForYear = async (year) => {
  const yearPrefix = `${ID_PREFIX}-${year}-`;

  const [result] = await RequestInfo.aggregate([
    {
      $match: {
        idnumber: { $regex: `^${yearPrefix}\\d+$` },
      },
    },
    {
      $addFields: {
        sequence: {
          $toInt: { $arrayElemAt: [{ $split: ['$idnumber', '-'] }, 2] },
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

const generateNextIdNumber = async (year = new Date().getFullYear()) => {
  const maxSequence = await getMaxSequenceForYear(year);
  return formatRequestId(year, maxSequence + 1);
};

const isDuplicateKeyError = (err) =>
  err?.code === 11000 && (err?.keyPattern?.idnumber || err?.keyValue?.idnumber);

module.exports = {
  ID_PREFIX,
  ID_NUMBER_PATTERN,
  SEQUENCE_PAD_LENGTH,
  MAX_GENERATION_ATTEMPTS,
  formatRequestId,
  parseRequestId,
  getMaxSequenceForYear,
  generateNextIdNumber,
  isDuplicateKeyError,
};
