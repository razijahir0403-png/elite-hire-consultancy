/**
 * Client workflow status codes — APIs store and return integers only.
 */

const CLIENT_STATUS = {
  INFO_VERIFIED: 0,
  DOCUMENT_RECEIVED: 1,
  DOCUMENT_UPLOADED: 2,
  DOCUMENT_NOT_RECEIVED: 3,
  DOCUMENT_MIS_MATCHED: 4,
  RECEIVED_CALL: 5,
  NO_RESPONSE: 6,
  CALL_BACK: 7,
  WRONG_NUMBER: 8,
  SENT_FOLLOW_UP: 9,
  URGENT_NOTES: 10,
  SELECTED: 11,
  REJECTED: 12,
  CANCELLED: 13,
  REOPEN: 14,
  INTERNAL_NOTE: 15,
  NEED_AN_HELP: 16,
  PAYMENT_COMPLETED: 17,
  PAYMENT_PENDING: 18,
  RESPONSE_RECEIVED: 19,
};

const CLIENT_STATUS_MAX = 19;

const ClientStatusLabel = {
  0: 'Info Verified',
  1: 'Document Received',
  2: 'Document Uploaded',
  3: 'Document Not Received',
  4: 'Document Mis-Matched',
  5: 'Received Call From the Client',
  6: 'No Response',
  7: 'Call Back',
  8: 'Wrong Number',
  9: 'Sent Follow Up Message',
  10: 'Urgent Notes',
  11: 'Selected',
  12: 'Rejected',
  13: 'Cancelled',
  14: 'Re-Open',
  15: 'Internal Note',
  16: 'Need an Help',
  17: 'Payment Completed',
  18: 'Payment Pending',
  19: 'Response Received',
};

const CLIENT_TEXT_TO_CODE = Object.entries(ClientStatusLabel).reduce((acc, [code, label]) => {
  acc[label] = Number(code);
  return acc;
}, {});

const toNumber = (value, fallback = 0) => {
  if (value === '' || value === null || value === undefined) return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
};

const toClientStatusCode = (value, fallback = CLIENT_STATUS.INFO_VERIFIED) => {
  if (typeof value === 'string') {
    if (CLIENT_TEXT_TO_CODE[value] !== undefined) return CLIENT_TEXT_TO_CODE[value];
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return toNumber(value, fallback);
};

const clientFilterOptions = () =>
  Object.entries(ClientStatusLabel).map(([value, label]) => ({
    label,
    value: Number(value),
  }));

module.exports = {
  CLIENT_STATUS,
  CLIENT_STATUS_MAX,
  ClientStatusLabel,
  CLIENT_TEXT_TO_CODE,
  toClientStatusCode,
  clientFilterOptions,
};
