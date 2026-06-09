import * as XLSX from 'xlsx';
import { formatDateDDMMYYYY } from './dateFormatter';

export const exportPaymentsToExcel = (records, filenamePrefix = 'payments-export') => {
  const rows = records.map((r) => ({
    'Payment ID': r.paymentId || '',
    'Client ID': r.clientId || '',
    'Client Name': r.clientName || '',
    'Total Amount': r.totalAmount || 0,
    'Paid Amount': r.paidAmount || 0,
    'Due Amount': r.dueAmount || 0,
    Status: r.status || '',
    'Updated On': formatDateDDMMYYYY(r.updatedOn),
    'Updated By': r.updatedBy || '',
    'Created At': formatDateDDMMYYYY(r.createdAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments');

  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filenamePrefix}-${dateStamp}.xlsx`);
};
