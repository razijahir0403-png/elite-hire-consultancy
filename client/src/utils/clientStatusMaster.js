export const CLIENT_STATUS = {
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

export const ClientStatus = {
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

export const ClientStatusColors = {
  0: 'bg-brand-50 text-brand-800 border-brand-200',
  11: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  12: 'bg-red-50 text-red-700 border-red-200',
  7: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  10: 'bg-orange-50 text-orange-700 border-orange-200',
  4: 'bg-orange-50 text-orange-700 border-orange-200',
  14: 'bg-violet-50 text-violet-700 border-violet-200',
  13: 'bg-slate-100 text-slate-700 border-slate-300',
  15: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

export const getClientStatusLabel = (code) => ClientStatus[Number(code)] ?? 'Unknown';

export const getClientStatusBadgeClass = (code) =>
  ClientStatusColors[Number(code)] || 'bg-slate-50 text-slate-600 border-slate-200';

export const clientFilterOptions = Object.entries(ClientStatus).map(([value, label]) => ({
  label,
  value: Number(value),
}));
