const RI_CONDITIONS = {
  DATA_UPLOADED: 1,
  ON_HOLD: 2,
  EMAIL_SENT: 3,
  SENT_FOLLOWUP_MESSAGE: 4,
  PROPOSAL_REQ_SUB: 5,
  DOC_SUB: 6,
  ACCEPT_CGP: 7,
  PLACEMENT_RECRUITMENT: 8,
  CANCELLED: 9,
  COMPLETED: 10,
  CONTRACT_CANCELLED: 11,
};

const RI_CONDITION_MAP = {
  1: 'Data Uploaded',
  2: 'On-Hold',
  3: 'Email Sent',
  4: 'Sent Follow Up Message',
  5: 'Proposal Req. Sub',
  6: 'Doc Sub',
  7: 'Accept for CGP',
  8: 'Placement Recruitment',
  9: 'Cancelled',
  10: 'Completed',
  11: 'Contract Cancelled',
};

const RI_CONDITION_KEY_TO_CODE = {
  dataUploaded: 1,
  onHold: 2,
  emailSent: 3,
  sentFollowupMessage: 4,
  proposalReqSub: 5,
  docSub: 6,
  acceptCgp: 7,
  placementRecruitment: 8,
  cancelled: 9,
  completed: 10,
  contractCancelled: 11,
};

const RI_CODE_TO_KEY = {
  1: 'dataUploaded',
  2: 'onHold',
  3: 'emailSent',
  4: 'sentFollowupMessage',
  5: 'proposalReqSub',
  6: 'docSub',
  7: 'acceptCgp',
  8: 'placementRecruitment',
  9: 'cancelled',
  10: 'completed',
  11: 'contractCancelled',
};

const RI_LABEL_TO_CODE = {
  'data uploaded': 1,
  'on-hold': 2,
  'onhold': 2,
  'email sent': 3,
  'sent follow up message': 4,
  'proposal req. sub': 5,
  'proposal req sub': 5,
  'doc sub': 6,
  'accept for cgp': 7,
  'accept cgp': 7,
  'placement recruitment': 8,
  'cancelled': 9,
  'completed': 10,
  'contract cancelled': 11,
};

const RI_CONDITIONS_LIST = [
  { value: 1, label: 'Data Uploaded', key: 'dataUploaded', desc: 'Candidate sourcing data uploaded' },
  { value: 2, label: 'On-Hold', key: 'onHold', desc: 'Pipeline action temporarily placed on hold' },
  { value: 3, label: 'Email Sent', key: 'emailSent', desc: 'Verification or communication email dispatched' },
  { value: 4, label: 'Sent Follow Up Message', key: 'sentFollowupMessage', desc: 'Follow-up notification forwarded' },
  { value: 5, label: 'Proposal Req. Sub', key: 'proposalReqSub', desc: 'Proposal request submitted' },
  { value: 6, label: 'Doc Sub', key: 'docSub', desc: 'Required documentation submitted' },
  { value: 7, label: 'Accept for CGP', key: 'acceptCgp', desc: 'Accepted for CGP program' },
  { value: 8, label: 'Placement Recruitment', key: 'placementRecruitment', desc: 'Placement recruitment initiated' },
  { value: 9, label: 'Cancelled', key: 'cancelled', desc: 'Sourcing action or pipeline status cancelled' },
  { value: 10, label: 'Completed', key: 'completed', desc: 'All requirements verified and fulfilled' },
  { value: 11, label: 'Contract Cancelled', key: 'contractCancelled', desc: 'Contract has been cancelled' },
];

/**
 * Safely convert any status input (number, string, label, condition key) to numeric code (1-11)
 * Returns null if not mapped or invalid
 */
const toRiConditionCode = (input) => {
  if (input === null || input === undefined || input === '' || input === 'NA' || input === 'na') {
    return null;
  }

  // If already a valid number 1-11
  if (typeof input === 'number' && Number.isInteger(input) && input >= 1 && input <= 11) {
    return input;
  }

  const str = String(input).trim();
  const num = parseInt(str, 10);
  if (!isNaN(num) && Number.isInteger(num) && num >= 1 && num <= 11 && String(num) === str) {
    return num;
  }

  // Lookup in label mapping
  const normalized = str.toLowerCase();
  if (RI_LABEL_TO_CODE[normalized] !== undefined) {
    return RI_LABEL_TO_CODE[normalized];
  }

  // Lookup in condition key mapping
  if (RI_CONDITION_KEY_TO_CODE[str] !== undefined) {
    return RI_CONDITION_KEY_TO_CODE[str];
  }

  return null;
};

/**
 * Get human-readable RI Condition label. Returns 'NA' if no status is active.
 */
const getRiConditionLabel = (input) => {
  const code = toRiConditionCode(input);
  if (code && RI_CONDITION_MAP[code]) {
    return RI_CONDITION_MAP[code];
  }
  return 'NA';
};

/**
 * Get condition key for given code
 */
const getRiConditionKey = (input) => {
  const code = toRiConditionCode(input);
  if (code && RI_CODE_TO_KEY[code]) {
    return RI_CODE_TO_KEY[code];
  }
  return null;
};

module.exports = {
  RI_CONDITIONS,
  RI_CONDITION_MAP,
  RI_CONDITION_KEY_TO_CODE,
  RI_CODE_TO_KEY,
  RI_LABEL_TO_CODE,
  RI_CONDITIONS_LIST,
  toRiConditionCode,
  getRiConditionLabel,
  getRiConditionKey,
};