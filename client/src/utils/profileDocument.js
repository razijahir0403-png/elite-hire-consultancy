export const MAX_PDF_SIZE = 150 * 1024; // 150 KB (153,600 bytes)

export const validateProfilePdf = (file) => {
  if (!file) return null;
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return 'Only PDF files are allowed.';
  }
  if (file.size > MAX_PDF_SIZE) {
    return 'File size must not exceed 150 KB.';
  }
  return null;
};
