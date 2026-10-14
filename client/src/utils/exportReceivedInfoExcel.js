import { formatDateDDMMYYYY } from './dateFormatter';

export const exportReceivedInfoToExcel = async (records, filenamePrefix = 'received-info-export') => {
  const XLSX = await import('xlsx');
  const rows = records.map((r) => ({
    'Request ID': r.requestId || '',
    Domain: r.domain || '',
    'Company Name': r.companyName || '',
    Location: r.location || '',
    'Resource Name': r.resourceName || '',
    'Mobile Number': r.mobileNumber || '',
    Email: r.email || '',
    Vendor: r.vendor || '',
    'Initial Status': r.status || r.currentStatus || r.initialStatus || 'NA',
    'Created Date': formatDateDDMMYYYY(r.createdAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Received Info');

  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filenamePrefix}-${dateStamp}.xlsx`);
};
