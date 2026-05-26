/** Strip non-digits and cap at 10 characters for mobile number input. */
export const sanitizeContactNumberInput = (value) =>
  String(value ?? '').replace(/\D/g, '').slice(0, 10);

/** Normalize stored values (e.g. legacy "+91 …") to digits-only for display/edit. */
export const normalizeContactNumber = (value) =>
  sanitizeContactNumberInput(value);

export const isValidContactNumber = (value) => /^\d{10}$/.test(String(value ?? ''));
