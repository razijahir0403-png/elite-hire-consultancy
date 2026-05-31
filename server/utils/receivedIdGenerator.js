const ReceivedInfo = require('../models/ReceivedInfo');

const ID_PREFIX = 'REQ';
const SEQUENCE_PAD_LENGTH = 4;
const MAX_GENERATION_ATTEMPTS = 5;

const formatRequestId = (sequence) =>
  `${ID_PREFIX}${String(sequence).padStart(SEQUENCE_PAD_LENGTH, '0')}`;

const getMaxSequence = async () => {
  // Sort descending to find the largest requestId, bypassing soft delete using the includeDeleted option
  const maxRecord = await ReceivedInfo.findOne({}, null, { includeDeleted: true })
    .sort({ requestId: -1 });

  if (!maxRecord || !maxRecord.requestId) {
    return 0;
  }

  // Parse sequence number from string like 'REQ0012'
  const match = maxRecord.requestId.match(/^REQ(\d+)$/);
  if (!match) {
    return 0;
  }

  return parseInt(match[1], 10);
};

const generateNextRequestId = async () => {
  const maxSequence = await getMaxSequence();
  return formatRequestId(maxSequence + 1);
};

const isDuplicateKeyError = (err) =>
  err?.code === 11000 && (err?.keyPattern?.requestId || err?.keyValue?.requestId);

module.exports = {
  ID_PREFIX,
  SEQUENCE_PAD_LENGTH,
  MAX_GENERATION_ATTEMPTS,
  formatRequestId,
  getMaxSequence,
  generateNextRequestId,
  isDuplicateKeyError,
};
