import * as XLSX from 'xlsx';
import { formatDateDDMMYYYY } from './dateFormatter';

export const exportEmployeesToExcel = (records, filenamePrefix = 'employees-export') => {
  const rows = records.map((r) => ({
    'Employee Code': r.employeeCode || '',
    'Employee Name': r.employeeName || '',
    'Date of Birth': formatDateDDMMYYYY(r.dob),
    'Blood Group': r.bloodGroup || '',
    'Contact Number': r.contactNumber || '',
    'Email ID': r.email || '',
    'Home Address': r.homeAddress || '',
    'Domain': r.domain || '',
    'Created At': formatDateDDMMYYYY(r.createdAt),
    'Created By': r.createdBy || '',
    'Updated By': r.updatedBy || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');

  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filenamePrefix}-${dateStamp}.xlsx`);
};
