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
  NEW_DATA: 20,
  ON_HOLD: 21,
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
  20: 'New Data',
  21: 'On-Hold',
};

export const ClientStatusColors = {
  0: 'bg-[#D9FFF0] text-[#047857] border-[#00D98B]/40', // Info Verified
  1: 'bg-[#F0F9FF] text-[#0284C7] border-[#38BDF8]/40', // Document Received
  2: 'bg-[#F0F9FF] text-[#0369A1] border-[#38BDF8]/40', // Document Uploaded
  3: 'bg-[#FFF1F2] text-[#BE123C] border-[#FB7185]/40', // Document Not Received
  4: 'bg-[#FFF7ED] text-[#C2410C] border-[#FDBA74]/50', // Document Mis-Matched
  5: 'bg-[#D9FFF0] text-[#047857] border-[#00D98B]/40', // Received Call From the Client
  6: 'bg-[#FFFBEB] text-[#B45309] border-[#FBBF24]/40', // No Response
  7: 'bg-[#FFFBEB] text-[#B45309] border-[#FBBF24]/40', // Call Back
  8: 'bg-[#FFF1F2] text-[#BE123C] border-[#FB7185]/40', // Wrong Number
  9: 'bg-[#F0F9FF] text-[#0284C7] border-[#38BDF8]/40', // Sent Follow Up Message
  10: 'bg-[#FFF1F2] text-[#BE123C] border-[#FB7185]/40', // Urgent Notes
  11: 'bg-[#D9FFF0] text-[#047857] border-[#00D98B] font-extrabold', // Selected
  12: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FCA5A5]', // Rejected
  13: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]', // Cancelled
  14: 'bg-[#F5F3FF] text-[#6D28D9] border-[#8B5CF6]/40', // Re-Open
  15: 'bg-[#EEF2FF] text-[#4338CA] border-[#A5B4FC]/40', // Internal Note
  16: 'bg-[#FFFBEB] text-[#B45309] border-[#FBBF24]/40', // Need an Help
  17: 'bg-[#D9FFF0] text-[#047857] border-[#00D98B]/50 font-bold', // Payment Completed
  18: 'bg-[#FFFBEB] text-[#B45309] border-[#FBBF24]/40', // Payment Pending
  19: 'bg-[#F0F9FF] text-[#0284C7] border-[#38BDF8]/40', // Response Received
  20: 'bg-[#F0F9FF] text-[#0284C7] border-[#38BDF8]/40', // New Data
  21: 'bg-[#FFFBEB] text-[#B45309] border-[#FBBF24]/40', // On-Hold
};

export const getClientStatusLabel = (code) => ClientStatus[Number(code)] ?? 'Unknown';

export const getClientStatusBadgeClass = (code) =>
  ClientStatusColors[Number(code)] || 'bg-slate-50 text-slate-600 border-slate-200';

export const clientFilterOptions = Object.entries(ClientStatus).map(([value, label]) => ({
  label,
  value: Number(value),
}));
