export const CR_STATUS = {
  DATA_UPLOADED: 1,
  ON_HOLD: 2,
  EMAIL_SENT: 3,
  SENT_FOLLOWUP_MESSAGE: 4,
  VFP_COMPLETED: 5,
  DOC_VERIFIED: 6,
  REQ_DOC_RECEIVED: 7,
  UR_REQUEST: 8,
  CANCELLED: 9,
  COMPLETED: 10,
  PAYMENT_COMPLETED: 11,
};

export const CR_STATUS_MAP = {
  1: 'Data Uploaded',
  2: 'On-Hold',
  3: 'Email Sent',
  4: 'Sent Followup Message',
  5: 'VFP Completed',
  6: 'Doc Verified',
  7: 'Req Doc Received',
  8: 'UR-Request',
  9: 'Cancelled',
  10: 'Completed',
  11: 'Payment Completed',
};

export const CR_KEY_TO_CODE = {
  dataUploaded: 1,
  onHold: 2,
  emailSent: 3,
  sentFollowupMessage: 4,
  vfpCompleted: 5,
  docVerified: 6,
  reqDocReceived: 7,
  urRequest: 8,
  cancelled: 9,
  completed: 10,
  paymentCompleted: 11,
};

export const CR_CODE_TO_KEY = {
  1: 'dataUploaded',
  2: 'onHold',
  3: 'emailSent',
  4: 'sentFollowupMessage',
  5: 'vfpCompleted',
  6: 'docVerified',
  7: 'reqDocReceived',
  8: 'urRequest',
  9: 'cancelled',
  10: 'completed',
  11: 'paymentCompleted',
};

export const CR_LABEL_TO_CODE = {
  'data uploaded': 1,
  'on-hold': 2,
  'onhold': 2,
  'email sent': 3,
  'sent followup message': 4,
  'vfp completed': 5,
  'doc verified': 6,
  'req doc received': 7,
  'req doc submitted': 7,
  'ur-request': 8,
  'urrequest': 8,
  'cancelled': 9,
  'completed': 10,
  'payment completed': 11,
};

export const CR_STATUS_OPTIONS = [
  { value: 1, label: 'Data Uploaded', key: 'dataUploaded', desc: 'Candidate sourcing data uploaded' },
  { value: 2, label: 'On-Hold', key: 'onHold', desc: 'Pipeline action temporarily placed on hold' },
  { value: 3, label: 'Email Sent', key: 'emailSent', desc: 'Verification or communication email dispatched' },
  { value: 4, label: 'Sent Followup Message', key: 'sentFollowupMessage', desc: 'Follow-up notification forwarded' },
  { value: 5, label: 'VFP Completed', key: 'vfpCompleted', desc: 'Verification form process completed' },
  { value: 6, label: 'Doc Verified', key: 'docVerified', desc: 'Credentials verified' },
  { value: 7, label: 'Req Doc Received', key: 'reqDocReceived', desc: 'Required documentation received' },
  { value: 8, label: 'UR-Request', key: 'urRequest', desc: 'Under review or university request initiated' },
  { value: 9, label: 'Cancelled', key: 'cancelled', desc: 'Sourcing action or pipeline status cancelled' },
  { value: 10, label: 'Completed', key: 'completed', desc: 'All requirements verified and fulfilled' },
  { value: 11, label: 'Payment Completed', key: 'paymentCompleted', desc: 'Payment has been completed successfully' },
];

/**
 * Safely convert any status input (number, string, label, condition key) to numeric code (1-11)
 * Returns null if not mapped or invalid
 */
export const toCrStatusCode = (input) => {
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
  if (CR_LABEL_TO_CODE[normalized] !== undefined) {
    return CR_LABEL_TO_CODE[normalized];
  }

  // Lookup in condition key mapping
  if (CR_KEY_TO_CODE[str] !== undefined) {
    return CR_KEY_TO_CODE[str];
  }

  return null;
};

/**
 * Get human-readable CR Status label. Returns 'NA' if no status is active.
 * Ensures UI never displays raw numbers.
 */
export const getCrStatusLabel = (input) => {
  const code = toCrStatusCode(input);
  if (code && CR_STATUS_MAP[code]) {
    return CR_STATUS_MAP[code];
  }
  return 'NA';
};

/**
 * Get condition key for given code or label
 */
export const getCrStatusKey = (input) => {
  const code = toCrStatusCode(input);
  if (code && CR_CODE_TO_KEY[code]) {
    return CR_CODE_TO_KEY[code];
  }
  return null;
};
