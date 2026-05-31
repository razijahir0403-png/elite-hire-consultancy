/** Strip non-digits and cap at 10 characters for mobile number input. */
export const sanitizeContactNumberInput = (value) =>
  String(value ?? '').replace(/\D/g, '').slice(0, 10);

/** Normalize stored values (e.g. legacy "+91 …") to digits-only for display/edit. */
export const normalizeContactNumber = (value) =>
  sanitizeContactNumberInput(value);

/** Empty is valid; otherwise must be exactly 10 digits. */
export const isValidContactNumber = (value) => {
  const digits = String(value ?? '');
  if (!digits) return true;
  return /^\d{10}$/.test(digits);
};
