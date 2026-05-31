/** Returns true when value is empty or a valid email address. */
export const isValidEmail = (value) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return true;
  return /^\S+@\S+\.\S+$/.test(trimmed);
};

export const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();
