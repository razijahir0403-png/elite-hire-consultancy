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
  PROCESS_COMPLETED: 11,
  CANCELLED: 12,
  REOPEN: 13,
  INTERNAL_NOTE: 14,
  NEED_AN_HELP: 15,
  PAYMENT_COMPLETED: 16,
  PAYMENT_PENDING: 17,
  MESSAGE_RECEIVED: 18,
  NEW_DATA: 19,
  ON_HOLD: 20,
  REQUIRED_DOCUMENT_NEEDED: 21,
  PLACED_CALL: 22,
  ATTENTION_REQUIRED: 23,
  UPDATE_NEEDED: 24,
  UPDATE_COMPLETED: 25,
};

const CLIENT_STATUS_MAX = 25;

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
  11: 'Process Completed',
  12: 'Cancelled',
  13: 'Re-Open',
  14: 'Internal Note',
  15: 'Need an Help',
  16: 'Payment Completed',
  17: 'Payment Pending',
  18: 'Message Received',
  19: 'New Data',
  20: 'On-Hold',
  21: 'Required Document Needed',
  22: 'Placed Call',
  23: 'Attention Required',
  24: 'Update Needed',
  25: 'Update Completed',
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

const { isWorkflowStatusHistory } = require('./statusMaster');

module.exports = {
  isWorkflowStatusHistory,
  CLIENT_STATUS,
  CLIENT_STATUS_MAX,
  ClientStatusLabel,
  CLIENT_TEXT_TO_CODE,
  toClientStatusCode,
  clientFilterOptions,
};
