const RequestInfo = require('../models/RequestInfo');

const ID_PREFIX = 'RAS';
const SEQUENCE_PAD_LENGTH = 3;
const MAX_GENERATION_ATTEMPTS = 5;

/** Matches RAS-YYYY-XXX (sequence is 3+ digits when sequence exceeds 999). */
const ID_NUMBER_PATTERN = /^RAS-(\d{4})-(\d+)$/;

/** Matches both RAS-YYYY-XXX and legacy EH-YYYY-XXX formats for parsing. */
const LEGACY_ID_NUMBER_PATTERN = /^(?:RAS|EH)-(\d{4})-(\d+)$/;

const formatRequestId = (year, sequence) =>
  `${ID_PREFIX}-${year}-${String(sequence).padStart(SEQUENCE_PAD_LENGTH, '0')}`;

const parseRequestId = (idnumber) => {
  const match = String(idnumber || '').match(LEGACY_ID_NUMBER_PATTERN);
  if (!match) return null;
  return {
    year: Number(match[1]),
    sequence: Number(match[2]),
  };
};

/**
 * Highest numeric sequence for the year across all records (including soft-deleted).
 * Aggregate bypasses soft-delete query middleware so occupied IDs are not reused.
 * Matches both RAS and legacy EH prefixes so existing records and new records
 * coexist seamlessly without duplicate sequence numbers.
 */
const getMaxSequenceForYear = async (year) => {
  const [result] = await RequestInfo.aggregate([
    {
      $match: {
        idnumber: { $regex: `^(?:${ID_PREFIX}|EH)-${year}-\\d+$` },
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
  LEGACY_ID_NUMBER_PATTERN,
  SEQUENCE_PAD_LENGTH,
  MAX_GENERATION_ATTEMPTS,
  formatRequestId,
  parseRequestId,
  getMaxSequenceForYear,
  generateNextIdNumber,
  isDuplicateKeyError,
};
