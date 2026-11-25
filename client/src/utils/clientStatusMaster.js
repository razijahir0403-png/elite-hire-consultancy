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
  11: 'bg-[#D9FFF0] text-[#047857] border-[#00D98B] font-extrabold', // Process Completed
  12: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]', // Cancelled
  13: 'bg-[#F5F3FF] text-[#6D28D9] border-[#8B5CF6]/40', // Re-Open
  14: 'bg-[#EEF2FF] text-[#4338CA] border-[#A5B4FC]/40', // Internal Note
  15: 'bg-[#FFFBEB] text-[#B45309] border-[#FBBF24]/40', // Need an Help
  16: 'bg-[#D9FFF0] text-[#047857] border-[#00D98B]/50 font-bold', // Payment Completed
  17: 'bg-[#FFFBEB] text-[#B45309] border-[#FBBF24]/40', // Payment Pending
  18: 'bg-[#F0F9FF] text-[#0284C7] border-[#38BDF8]/40', // Message Received
  19: 'bg-[#F0F9FF] text-[#0284C7] border-[#38BDF8]/40', // New Data
  20: 'bg-[#FFFBEB] text-[#B45309] border-[#FBBF24]/40', // On-Hold
  21: 'bg-[#FFF7ED] text-[#C2410C] border-[#FDBA74]/50', // Required Document Needed
  22: 'bg-[#EFF4F6] text-[#07566A] border-[#CBD7DA]',     // Placed Call
  23: 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]/50', // Attention Required
  24: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#93C5FD]/40', // Update Needed
  25: 'bg-[#D9FFF0] text-[#047857] border-[#00D98B]/50 font-bold', // Update Completed
};

export const getClientStatusLabel = (code) => {
  if (code === undefined || code === null) return 'Unknown';
  if (typeof code === 'string') {
    if (ClientStatus[code]) return ClientStatus[code];
    const num = Number(code);
    if (!Number.isNaN(num) && ClientStatus[num]) return ClientStatus[num];
    if (Object.values(ClientStatus).includes(code)) return code;
    return code;
  }
  return ClientStatus[Number(code)] ?? 'Unknown';
};

export const getClientStatusBadgeClass = (code) => {
  const num = Number(code);
  if (!Number.isNaN(num) && ClientStatusColors[num]) {
    return ClientStatusColors[num];
  }
  const entry = Object.entries(ClientStatus).find(([_, label]) => label === code);
  if (entry && ClientStatusColors[Number(entry[0])]) {
    return ClientStatusColors[Number(entry[0])];
  }
  return 'bg-slate-50 text-slate-600 border-slate-200';
};

export const clientFilterOptions = Object.entries(ClientStatus).map(([value, label]) => ({
  label,
  value: Number(value),
}));
