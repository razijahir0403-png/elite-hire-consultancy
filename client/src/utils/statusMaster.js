export const COMMON_STATUS = { INACTIVE: 0, ACTIVE: 1 };

export const APPROVAL_STATUS = { PENDING: 0, APPROVED: 1, REJECTED: 2, HOLD: 3 };

export const TICKET_STATUS = { OPEN: 0, IN_PROGRESS: 1, RESOLVED: 2, CLOSED: 3 };

export const ASSET_STATUS = { AVAILABLE: 0, ASSIGNED: 1, MAINTENANCE: 2, SCRAP: 3 };

export const RECRUITMENT_STATUS = {
  VERIFIED: 0,
  NOT_TO_VERIFIED: 1,
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
};

export const RECRUITMENT_STATUS_MAX = 23;

export const CommonStatus = { 0: 'Inactive', 1: 'Active' };

export const ApprovalStatus = { 0: 'Pending', 1: 'Approved', 2: 'Rejected', 3: 'Hold' };

export const TicketStatus = { 0: 'Open', 1: 'In Progress', 2: 'Resolved', 3: 'Closed' };

export const AssetStatus = { 0: 'Available', 1: 'Assigned', 2: 'Maintenance', 3: 'Scrap' };

export const RecruitmentStatus = {
  0: 'Verified',
  1: 'Not to Verified',
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
};

/** Tailwind badge classes per status type */
export const StatusColors = {
  recruitment: {
    0: 'bg-brand-50 text-brand-800 border-brand-200',
    13: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    14: 'bg-red-50 text-red-700 border-red-200',
    11: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    2: 'bg-orange-50 text-orange-700 border-orange-200',
    3: 'bg-orange-50 text-orange-700 border-orange-200',
    12: 'bg-orange-50 text-orange-700 border-orange-200',
    17: 'bg-violet-50 text-violet-700 border-violet-200',
    18: 'bg-slate-100 text-slate-700 border-slate-300',
    19: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  common: {
    0: 'bg-slate-50 text-slate-600 border-slate-200',
    1: 'bg-emerald-50 text-emerald-700 border-emerald-200',
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
