export const COMMON_STATUS = { INACTIVE: 0, ACTIVE: 1 };

export const APPROVAL_STATUS = { PENDING: 0, APPROVED: 1, REJECTED: 2, HOLD: 3 };

export const TICKET_STATUS = { OPEN: 0, IN_PROGRESS: 1, RESOLVED: 2, CLOSED: 3 };

export const ASSET_STATUS = { AVAILABLE: 0, ASSIGNED: 1, MAINTENANCE: 2, SCRAP: 3 };

export const RECRUITMENT_STATUS = {
  VERIFIED: 0,
  NEED_TO_VERIFY: 1,
  INVALID_INFO: 2,
  WRONG_INFO: 3,
  MIS_MATCHED: 4,
  MESSAGE_FORWARDED: 5,
  EMAIL_SENT: 6,
  CALL_RECEIVED: 7,
  PLACED_CALL: 8,
  APPLIED_BY_PORTAL: 9,
  ISSUE_WITH_APPLYING: 10,
  CALL_BACK: 11,
  INVALID_OR_WRONG_NUMBER: 12,
  PROCESS_COMPLETED: 13,
  CANCELLED_SLA: 14,
  DUPLICATE: 15,
  REOPEN: 16,
  CANCELLED: 17,
  INTERNAL_NOTE: 18,
  INFO_UPDATED: 19,
  MESSAGE_RECEIVED: 20,
  NEED_AN_HELP: 21,
  SENT_FOLLOW_UP: 22,
  ON_HOLD: 23,
  DOCUMENTS_UPLOAD_NEEDED: 24,
  DOCUMENTS_UPLOADED: 25,
  UPDATE_REQUIRED: 26,
  ATTENTION_REQUIRED: 27,
  URGENT_NOTE: 28,
  NEW_INFO: 29,
  UPDATE_COMPLETED: 30,
};

export const RECRUITMENT_STATUS_MAX = 30;

// ============================================================
// RECEIVED INFO WORKFLOW STATUS - INTEGER MAPPING (1-based)
// ============================================================
// Single source of truth for frontend and backend
// Stored as BSON Integer in MongoDB
export const RECEIVED_INFO_STATUS_MAP = {
  1: 'New Info',
  2: 'Request Proposal submitted',
  3: 'Documents Submitted',
  4: 'Contact Made',
  5: 'Sent Follow up Message',
  6: 'Received Call',
  7: 'Issue with Management',
  8: 'Internal Note',
  9: 'Message Received',
  10: 'Re-Open',
  11: 'Contract Cancelled',
  12: 'Process Completed',
  13: 'Follow up Meet',
  14: 'Issue with Call',
  15: 'On-Hold',
  16: 'Required Document Needed',
  17: 'Placed Call',
  18: 'Attention Required',
  19: 'Update Needed',
  20: 'Update Completed',
};

// Reverse mapping for validation
export const RECEIVED_INFO_STATUS_REVERSE_MAP = Object.fromEntries(
  Object.entries(RECEIVED_INFO_STATUS_MAP).map(([k, v]) => [v, Number(k)])
);

// Dropdown options for UI
export const RECEIVED_INFO_STATUS_OPTIONS = Object.entries(RECEIVED_INFO_STATUS_MAP).map(([value, label]) => ({
  value: Number(value),
  label,
}));

// Color mapping by integer key
export const RECEIVED_INFO_STATUS_COLORS = {
  1: 'bg-brand-50 text-brand-800 border-brand-200',
  2: 'bg-purple-50 text-purple-700 border-purple-200',
  3: 'bg-teal-50 text-teal-700 border-teal-200',
  4: 'bg-blue-50 text-blue-700 border-blue-200',
  5: 'bg-sky-50 text-sky-700 border-sky-200',
  6: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  7: 'bg-orange-50 text-orange-700 border-orange-200',
  8: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  9: 'bg-violet-50 text-violet-700 border-violet-200',
  10: 'bg-violet-50 text-violet-700 border-violet-200',
  11: 'bg-slate-100 text-slate-700 border-slate-300',
  12: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  13: 'bg-amber-50 text-amber-700 border-amber-200',
  14: 'bg-orange-50 text-orange-700 border-orange-200',
  15: 'bg-amber-50 text-amber-700 border-amber-200',
  16: 'bg-[#FFF7ED] text-[#C2410C] border-[#FDBA74]/50', // Required Document Needed
  17: 'bg-[#EFF4F6] text-[#07566A] border-[#CBD7DA]',     // Placed Call
  18: 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]/50', // Attention Required
  19: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#93C5FD]/40', // Update Needed
  20: 'bg-[#D9FFF0] text-[#047857] border-[#00D98B]/50 font-bold', // Update Completed
};

export const CommonStatus = { 0: 'Inactive', 1: 'Active' };

export const ApprovalStatus = { 0: 'Pending', 1: 'Approved', 2: 'Rejected', 3: 'Hold' };

export const TicketStatus = { 0: 'Open', 1: 'In Progress', 2: 'Resolved', 3: 'Closed' };

export const AssetStatus = { 0: 'Available', 1: 'Assigned', 2: 'Maintenance', 3: 'Scrap' };

export const RecruitmentStatus = {
  0: 'Verified',
  1: 'Need to Verify',
  2: 'Invalid Info',
  3: 'Wrong Info',
  4: 'Mis-Matched',
  5: 'Message Forwarded',
  6: 'E Mail Sent',
  7: 'Call Received',
  8: 'Placed Call',
  9: 'Applied by Portal',
  10: 'Issue with Applying',
  11: 'Call Back',
  12: 'Invalid or Wrong Number',
  13: 'Process Completed',
  14: 'Cancelled as per SLA',
  15: 'Duplicate',
  16: 'Reopen',
  17: 'Cancelled',
  18: 'Internal Note',
  19: 'Info Updated',
  20: 'Message Received',
  21: 'Need an Help',
  22: 'Sent Follow up Message',
  23: 'On-Hold',
  24: 'Documents Upload Needed',
  25: 'Documents Uploaded',
  26: 'Update Required',
  27: 'Attention Required',
  28: 'Urgent Note',
  29: 'New Info',
  30: 'Update Completed',
};

/** Tailwind badge classes per status type */
export const StatusColors = {
  recruitment: {
    0: 'bg-[#D9FFF0] text-[#047857] border-[#00D98B]/40', // Verified
    1: 'bg-[#F0F9FF] text-[#0369A1] border-[#38BDF8]/40', // Need to Verify
    2: 'bg-[#FFF1F2] text-[#BE123C] border-[#FB7185]/40', // Invalid Info
    3: 'bg-[#FFF1F2] text-[#BE123C] border-[#FB7185]/40', // Wrong Info
    4: 'bg-[#FFF7ED] text-[#C2410C] border-[#FDBA74]/50', // Mis-Matched
    5: 'bg-[#F0F9FF] text-[#0284C7] border-[#38BDF8]/40', // Message Forwarded
    6: 'bg-[#F0F9FF] text-[#0284C7] border-[#38BDF8]/40', // E Mail Sent
    7: 'bg-[#D9FFF0] text-[#047857] border-[#00D98B]/40', // Call Received
    8: 'bg-[#EFF4F6] text-[#07566A] border-[#CBD7DA]',     // Placed Call
    9: 'bg-[#F5F3FF] text-[#6D28D9] border-[#8B5CF6]/40', // Applied by Portal
    10: 'bg-[#FFFBEB] text-[#B45309] border-[#FBBF24]/40', // Issue with Applying
    11: 'bg-[#FFFBEB] text-[#B45309] border-[#FBBF24]/40', // Call Back
    12: 'bg-[#FFF1F2] text-[#BE123C] border-[#FB7185]/40', // Invalid or Wrong Number
    13: 'bg-[#D9FFF0] text-[#047857] border-[#00D98B] font-extrabold', // Process Completed
    14: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]', // Cancelled as per SLA
    15: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]', // Duplicate
    16: 'bg-[#F5F3FF] text-[#6D28D9] border-[#8B5CF6]/40', // Reopen
    17: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]', // Cancelled
    18: 'bg-[#EEF2FF] text-[#4338CA] border-[#A5B4FC]/40', // Internal Note
    19: 'bg-[#EFF4F6] text-[#07566A] border-[#CBD7DA]',     // Info Updated
    20: 'bg-[#F0F9FF] text-[#0284C7] border-[#38BDF8]/40', // Message Received
    21: 'bg-[#FFFBEB] text-[#B45309] border-[#FBBF24]/40', // Need an Help
    22: 'bg-[#F0F9FF] text-[#0284C7] border-[#38BDF8]/40', // Sent Follow up Message
    23: 'bg-[#FFFBEB] text-[#B45309] border-[#FBBF24]/40', // On-Hold
    24: 'bg-[#FFF7ED] text-[#C2410C] border-[#FDBA74]/50', // Documents Upload Needed
    25: 'bg-[#D9FFF0] text-[#047857] border-[#00D98B]/40', // Documents Uploaded
    26: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#93C5FD]/40', // Update Required
    27: 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]/50', // Attention Required
    28: 'bg-[#FFF1F2] text-[#BE123C] border-[#FB7185]/40', // Urgent Note
    29: 'bg-[#F0F9FF] text-[#0369A1] border-[#38BDF8]/40', // New Info
    30: 'bg-[#D9FFF0] text-[#047857] border-[#00D98B]/50 font-bold', // Update Completed
  },
  approval: {
    0: 'bg-[#FFFBEB] text-[#B45309] border-[#FBBF24]/40', // Pending
    1: 'bg-[#D9FFF0] text-[#047857] border-[#00D98B]/40', // Approved
    2: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FCA5A5]',     // Rejected
    3: 'bg-[#FFFBEB] text-[#B45309] border-[#FBBF24]/40', // Hold
  },
  ticket: {
    0: 'bg-[#F0F9FF] text-[#0284C7] border-[#38BDF8]/40', // Open
    1: 'bg-[#F5F3FF] text-[#6D28D9] border-[#8B5CF6]/40', // In Progress
    2: 'bg-[#D9FFF0] text-[#047857] border-[#00D98B]/40', // Resolved
    3: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]',     // Closed
  },
  asset: {
    0: 'bg-[#D9FFF0] text-[#047857] border-[#00D98B]/40', // Available
    1: 'bg-[#F0F9FF] text-[#0284C7] border-[#38BDF8]/40', // Assigned
    2: 'bg-[#FFFBEB] text-[#B45309] border-[#FBBF24]/40', // Maintenance
    3: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FCA5A5]',     // Scrap
  },
  common: {
    0: 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]',     // Inactive
    1: 'bg-[#D9FFF0] text-[#047857] border-[#00D98B]/40', // Active
  },
  'received-info': RECEIVED_INFO_STATUS_COLORS,
};

export const getStatusLabel = (type, code) => {
  const maps = {
    recruitment: RecruitmentStatus,
    approval: ApprovalStatus,
    ticket: TicketStatus,
    asset: AssetStatus,
    common: CommonStatus,
  };
  
  // For received-info type, status is an integer (1-15)
  if (type === 'received-info') {
    const num = Number(code);
    if (Number.isInteger(num) && RECEIVED_INFO_STATUS_MAP[num]) {
      return RECEIVED_INFO_STATUS_MAP[num];
    }
    // Backward compatibility: if a string label is stored, try reverse lookup
    const str = String(code || '').trim();
    const mappedNum = RECEIVED_INFO_STATUS_REVERSE_MAP[str];
    if (mappedNum) {
      return RECEIVED_INFO_STATUS_MAP[mappedNum];
    }
    return str || 'Unknown';
  }
  
  const map = maps[type] || RecruitmentStatus;
  const key = Number(code);
  return map[key] ?? 'Unknown';
};

export const getStatusBadgeClass = (type, code) => {
  // For received-info type, use integer-based color mapping
  if (type === 'received-info') {
    const num = Number(code);
    if (Number.isInteger(num) && RECEIVED_INFO_STATUS_COLORS[num]) {
      return RECEIVED_INFO_STATUS_COLORS[num];
    }
    // Backward compatibility: if a string label is stored, try reverse lookup
    const str = String(code || '').trim();
    const mappedNum = RECEIVED_INFO_STATUS_REVERSE_MAP[str];
    if (mappedNum && RECEIVED_INFO_STATUS_COLORS[mappedNum]) {
      return RECEIVED_INFO_STATUS_COLORS[mappedNum];
    }
    return 'bg-slate-50 text-slate-600 border-slate-200';
  }
  
  const key = Number(code);
  const typeMap = StatusColors[type] || StatusColors.recruitment;
  return typeMap[key] || 'bg-slate-50 text-slate-600 border-slate-200';
};

export const recruitmentFilterOptions = Object.entries(RecruitmentStatus).map(([value, label]) => ({
  label,
  value: Number(value),
}));

/**
 * Helper to determine if a history item is a Workflow Status update event.
 * Filters out Conditions Required (CR Status), Remarks, Document uploads/deletions,
 * Email Pack activities, and other non-workflow audit entries.
 */
export const isWorkflowStatusHistory = (item) => {
  if (!item) return false;

  // If explicit workflow eventType is present
  if (item.eventType && ['workflow_status', 'status_update', 'status'].includes(item.eventType)) {
    return true;
  }
  if (item.type && ['workflow_status', 'status_update', 'status'].includes(item.type)) {
    return true;
  }

  // Exclude non-workflow event types if present
  if (item.eventType && !['workflow_status', 'status_update', 'status'].includes(item.eventType)) {
    return false;
  }
  if (item.type && !['workflow_status', 'status_update', 'status'].includes(item.type)) {
    return false;
  }

  const desc = String(item.description || '').trim();

  // Exclude Conditions Required / CR / RI Status updates
  if (/^(?:CR|RI)\s*(?:Condition|Status)/i.test(desc)) return false;
  if (/Conditions?\s+Required/i.test(desc)) return false;
  if (/\b(?:CR|RI)\s*(?:Status|Condition)\s*set\b/i.test(desc)) return false;

  // Exclude Remarks updates
  if (/^Remarks?\s*(?:updated|added|edited|created)?$/i.test(desc)) return false;
  if (/^Remarks?:/i.test(desc)) return false;
  if (/\bRemarks?\s+updated\b/i.test(desc)) return false;

  // Exclude Document uploads, replacements, deletions
  if (/(?:uploaded|deleted)\s*:/i.test(desc)) return false;
  if (/\bdocument\s+(?:uploaded|deleted|replaced)\b/i.test(desc)) return false;
  if (/\b(?:uploaded|deleted|replaced)\s+document\b/i.test(desc)) return false;
  if (/\b(?:Request\s*Letter|URL\s*Letter|Company\s*Profile|Proposal\s*Request|Contract\s*Agreement|MOU\s*File|CL\s*Proof|Cover\s*Letter|CL\s*Profile)\b.*(?:uploaded|deleted)/i.test(desc)) return false;

  // Exclude Email Pack activities
  if (/email\s*pack/i.test(desc)) return false;

  return true;
};
