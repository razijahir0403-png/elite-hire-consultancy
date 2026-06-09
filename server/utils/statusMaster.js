/**
 * Centralized numeric status codes — APIs store and return integers only.
 */

const COMMON_STATUS = {
  INACTIVE: 0,
  ACTIVE: 1,
};

const APPROVAL_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
  HOLD: 3,
};

const TICKET_STATUS = {
  OPEN: 0,
  IN_PROGRESS: 1,
  RESOLVED: 2,
  CLOSED: 3,
};

const ASSET_STATUS = {
  AVAILABLE: 0,
  ASSIGNED: 1,
  MAINTENANCE: 2,
  SCRAP: 3,
};

const RECRUITMENT_STATUS = {
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
};

const RECRUITMENT_STATUS_MAX = 23;

const CommonStatusLabel = {
  0: 'Inactive',
  1: 'Active',
};

const ApprovalStatusLabel = {
  0: 'Pending',
  1: 'Approved',
  2: 'Rejected',
  3: 'Hold',
};

const TicketStatusLabel = {
  0: 'Open',
  1: 'In Progress',
  2: 'Resolved',
  3: 'Closed',
};

const AssetStatusLabel = {
  0: 'Available',
  1: 'Assigned',
  2: 'Maintenance',
  3: 'Scrap',
};

const RecruitmentStatusLabel = {
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
};

const RECRUITMENT_TEXT_TO_CODE = Object.entries(RecruitmentStatusLabel).reduce((acc, [code, label]) => {
  acc[label] = Number(code);
  return acc;
}, {});

const toNumber = (value, fallback = 0) => {
  if (value === '' || value === null || value === undefined) return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
};

const getLabel = (map, code, fallback = 'Unknown') => {
  const key = toNumber(code, -1);
  return map[key] ?? fallback;
};

const toRecruitmentStatusCode = (value, fallback = RECRUITMENT_STATUS.VERIFIED) => {
  if (typeof value === 'string') {
    if (RECRUITMENT_TEXT_TO_CODE[value] !== undefined) return RECRUITMENT_TEXT_TO_CODE[value];
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return toNumber(value, fallback);
};

const recruitmentFilterOptions = () =>
  Object.entries(RecruitmentStatusLabel).map(([value, label]) => ({
    label,
    value: Number(value),
  }));

module.exports = {
  COMMON_STATUS,
  APPROVAL_STATUS,
  TICKET_STATUS,
  ASSET_STATUS,
  RECRUITMENT_STATUS,
  RECRUITMENT_STATUS_MAX,
  CommonStatusLabel,
  ApprovalStatusLabel,
  TicketStatusLabel,
  AssetStatusLabel,
  RecruitmentStatusLabel,
  RECRUITMENT_TEXT_TO_CODE,
  toNumber,
  getLabel,
  toRecruitmentStatusCode,
  recruitmentFilterOptions,
};
