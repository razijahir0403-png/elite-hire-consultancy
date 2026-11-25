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

const RECRUITMENT_STATUS_MAX = 30;

const RECEIVED_INFO_STATUS = {
  NEW_INFO: 1,
  REQUEST_PROPOSAL_SUBMITTED: 2,
  DOCUMENTS_SUBMITTED: 3,
  CONTACT_MADE: 4,
  SENT_FOLLOW_UP_MESSAGE: 5,
  RECEIVED_CALL: 6,
  ISSUE_WITH_MANAGEMENT: 7,
  INTERNAL_NOTE: 8,
  MESSAGE_RECEIVED: 9,
  RE_OPEN: 10,
  CONTRACT_CANCELLED: 11,
  PROCESS_COMPLETED: 12,
  FOLLOW_UP_MEET: 13,
  ISSUE_WITH_CALL: 14,
  ON_HOLD: 15,
  REQUIRED_DOCUMENT_NEEDED: 16,
  PLACED_CALL: 17,
  ATTENTION_REQUIRED: 18,
  UPDATE_NEEDED: 19,
  UPDATE_COMPLETED: 20,
};

const RECEIVED_INFO_STATUS_MAX = 20;

const ReceivedInfoStatusLabel = {
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

const RECRUITMENT_TEXT_TO_CODE = Object.entries(RecruitmentStatusLabel).reduce((acc, [code, label]) => {
  acc[label] = Number(code);
  return acc;
}, {});

const RECEIVED_INFO_TEXT_TO_CODE = Object.entries(ReceivedInfoStatusLabel).reduce((acc, [code, label]) => {
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

const toReceivedInfoStatusCode = (value, fallback = RECEIVED_INFO_STATUS.NEW_INFO) => {
  if (typeof value === 'string') {
    if (RECEIVED_INFO_TEXT_TO_CODE[value] !== undefined) return RECEIVED_INFO_TEXT_TO_CODE[value];
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


const isWorkflowStatusHistory = (item) => {
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

module.exports = {
  isWorkflowStatusHistory,
  COMMON_STATUS,
  APPROVAL_STATUS,
  TICKET_STATUS,
  ASSET_STATUS,
  RECRUITMENT_STATUS,
  RECRUITMENT_STATUS_MAX,
  RECEIVED_INFO_STATUS,
  RECEIVED_INFO_STATUS_MAX,
  CommonStatusLabel,
  ApprovalStatusLabel,
  TicketStatusLabel,
  AssetStatusLabel,
  RecruitmentStatusLabel,
  ReceivedInfoStatusLabel,
  RECRUITMENT_TEXT_TO_CODE,
  RECEIVED_INFO_TEXT_TO_CODE,
  toNumber,
  getLabel,
  getStatusLabel: getLabel,
  toRecruitmentStatusCode,
  toReceivedInfoStatusCode,
  recruitmentFilterOptions,
};
