export const MAX_PDF_SIZE = 200 * 1024;

export const validateProfilePdf = (file) => {
  if (!file) return null;
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return 'Only PDF files are allowed.';
  }
  if (file.size > MAX_PDF_SIZE) {
    return 'File size must not exceed 200 KB.';
  }
  return null;
};
