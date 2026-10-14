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
  CONTACT: 8,
  APPLIED_BY_PORTAL: 9,
  ISSUE_WITH_APPLYING: 10,
  CALL_BACK: 11,
  INVALID_OR_WRONG_NUMBER: 12,
  SELECTED: 13,
  REJECTED: 14,
  CANCELLED_SLA: 15,
  DUPLICATE: 16,
  REOPEN: 17,
  CANCELLED: 18,
  INTERNAL_NOTE: 19,
  INFO_UPDATED: 20,
  RESPONSE_RECEIVED: 21,
  NEED_AN_HELP: 22,
  SENT_FOLLOW_UP: 23,
  ON_HOLD: 24,
};

export const RECRUITMENT_STATUS_MAX = 24;

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
  8: 'Contact',
  9: 'Applied by Portal',
  10: 'Issue with Applying',
  11: 'Call Back',
  12: 'Invalid or Wrong Number',
  13: 'Selected',
  14: 'Rejected',
  15: 'Cancelled as per SLA',
  16: 'Duplicate',
  17: 'Reopen',
  18: 'Cancelled',
  19: 'Internal Note',
  20: 'Info Updated',
  21: 'Response Received',
  22: 'Need an Help',
  23: 'Sent Follow up Message',
  24: 'On-Hold',
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
    8: 'bg-[#EFF4F6] text-[#07566A] border-[#CBD7DA]',     // Contact
    9: 'bg-[#F5F3FF] text-[#6D28D9] border-[#8B5CF6]/40', // Applied by Portal
    10: 'bg-[#FFFBEB] text-[#B45309] border-[#FBBF24]/40', // Issue with Applying
    11: 'bg-[#FFFBEB] text-[#B45309] border-[#FBBF24]/40', // Call Back
    12: 'bg-[#FFF1F2] text-[#BE123C] border-[#FB7185]/40', // Invalid or Wrong Number
    13: 'bg-[#D9FFF0] text-[#047857] border-[#00D98B] font-extrabold', // Selected
    14: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FCA5A5]', // Rejected
    15: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]', // Cancelled as per SLA
    16: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]', // Duplicate
    17: 'bg-[#F5F3FF] text-[#6D28D9] border-[#8B5CF6]/40', // Reopen
    18: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]', // Cancelled
    19: 'bg-[#EEF2FF] text-[#4338CA] border-[#A5B4FC]/40', // Internal Note
    20: 'bg-[#EFF4F6] text-[#07566A] border-[#CBD7DA]',     // Info Updated
    21: 'bg-[#F0F9FF] text-[#0284C7] border-[#38BDF8]/40', // Response Received
    22: 'bg-[#FFFBEB] text-[#B45309] border-[#FBBF24]/40', // Need an Help
    23: 'bg-[#F0F9FF] text-[#0284C7] border-[#38BDF8]/40', // Sent Follow up Message
    24: 'bg-[#FFFBEB] text-[#B45309] border-[#FBBF24]/40', // On-Hold
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
};

export const getStatusLabel = (type, code) => {
  const maps = {
    recruitment: RecruitmentStatus,
    approval: ApprovalStatus,
    ticket: TicketStatus,
    asset: AssetStatus,
    common: CommonStatus,
  };
  const map = maps[type] || RecruitmentStatus;
  const key = Number(code);
  return map[key] ?? 'Unknown';
};

export const getStatusBadgeClass = (type, code) => {
  const key = Number(code);
  const typeMap = StatusColors[type] || StatusColors.recruitment;
  return typeMap[key] || 'bg-slate-50 text-slate-600 border-slate-200';
};

export const recruitmentFilterOptions = Object.entries(RecruitmentStatus).map(([value, label]) => ({
  label,
  value: Number(value),
}));
