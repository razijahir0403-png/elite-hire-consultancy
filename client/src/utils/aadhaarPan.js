/**
 * Utility functions for validating and sanitizing Indian Aadhaar and PAN card numbers.
 */

/**
 * Sanitizes Aadhaar input by stripping non-digit characters and limiting length to exactly 12 digits.
 * @param {string} value
 * @returns {string}
 */
export const sanitizeAadhaarInput = (value) =>
  String(value ?? '').replace(/\D/g, '').slice(0, 12);

/**
 * Checks if Aadhaar number is valid.
 * Empty value is valid (for optional handling); if provided, must be exactly 12 digits.
 * @param {string} value
 * @returns {boolean}
 */
export const isValidAadhaarNumber = (value) => {
  const digits = String(value ?? '').trim();
  if (!digits) return true;
  return /^\d{12}$/.test(digits);
};

/**
 * Sanitizes PAN input by converting to uppercase, stripping non-alphanumeric characters,
 * and limiting length to 10 characters.
 * @param {string} value
 * @returns {string}
 */
export const sanitizePanInput = (value) =>
  String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);

/**
 * Checks if PAN card number conforms to standard Indian format: ABCDE1234F
 * (5 uppercase letters, 4 digits, 1 uppercase letter).
 * Empty value is valid (for optional handling); if provided, must match pattern.
 * @param {string} value
 * @returns {boolean}
 */
export const isValidPanNumber = (value) => {
  const pan = String(value ?? '').trim().toUpperCase();
  if (!pan) return true;
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
};
