const Client = require('../models/Client');

const ID_PREFIX = 'CL';
const SEQUENCE_PAD_LENGTH = 3;
const MAX_GENERATION_ATTEMPTS = 5;

const CLIENT_ID_PATTERN = /^CL-(\d{4})-(\d+)$/;

const formatClientId = (year, sequence) =>
  `${ID_PREFIX}-${year}-${String(sequence).padStart(SEQUENCE_PAD_LENGTH, '0')}`;

const getMaxSequenceForYear = async (year) => {
  const yearPrefix = `${ID_PREFIX}-${year}-`;

  const [result] = await Client.aggregate([
    {
      $match: {
        clientId: { $regex: `^${yearPrefix}\\d+$` },
      },
    },
    {
      $addFields: {
        sequence: {
          $toInt: { $arrayElemAt: [{ $split: ['$clientId', '-'] }, 2] },
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

const generateNextClientId = async (year = new Date().getFullYear()) => {
  const maxSequence = await getMaxSequenceForYear(year);
  return formatClientId(year, maxSequence + 1);
};

const isDuplicateClientIdError = (err) =>
  err?.code === 11000 && (err?.keyPattern?.clientId || err?.keyValue?.clientId);

module.exports = {
  MAX_GENERATION_ATTEMPTS,
  generateNextClientId,
  isDuplicateClientIdError,
};
