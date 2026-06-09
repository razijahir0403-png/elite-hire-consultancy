const PaymentInfo = require('../models/PaymentInfo');

const ID_PREFIX = 'PAY';
const SEQUENCE_PAD_LENGTH = 4;
const MAX_GENERATION_ATTEMPTS = 5;

const formatPaymentId = (year, sequence) =>
  `${ID_PREFIX}-${year}-${String(sequence).padStart(SEQUENCE_PAD_LENGTH, '0')}`;

const getMaxSequenceForYear = async (year) => {
  const yearPrefix = `${ID_PREFIX}-${year}-`;

  const [result] = await PaymentInfo.aggregate([
    {
      $match: {
        paymentId: { $regex: `^${yearPrefix}\\d+$` },
      },
    },
    {
      $addFields: {
        sequence: {
          $toInt: { $arrayElemAt: [{ $split: ['$paymentId', '-'] }, 2] },
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

const generateNextPaymentId = async (year = new Date().getFullYear()) => {
  const maxSequence = await getMaxSequenceForYear(year);
  return formatPaymentId(year, maxSequence + 1);
};

const isDuplicatePaymentIdError = (err) =>
  err?.code === 11000 && (err?.keyPattern?.paymentId || err?.keyValue?.paymentId);

module.exports = {
  MAX_GENERATION_ATTEMPTS,
  generateNextPaymentId,
  isDuplicatePaymentIdError,
};
