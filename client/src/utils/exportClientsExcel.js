import * as XLSX from 'xlsx';
import { ClientStatus } from './clientStatusMaster';

import { formatDateDDMMYYYY } from './dateFormatter';

const statusLabel = (code) => ClientStatus[Number(code)] ?? '';

export const exportClientsToExcel = (records, filenamePrefix = 'clients-export') => {
  const rows = records.map((r) => ({
    'Client ID': r.clientId || '',
    'Client Name': r.clientName || '',
    'Mobile Number': r.mobile || '',
    Email: r.email || '',
    Category: r.category || '',
    'Profile Document': r.profileDocumentName || '',
    Status: statusLabel(r.status),
    Description: r.description || '',
    'Created Date': formatDateDDMMYYYY(r.createdDate || r.createdAt),
    'Created By': r.createdBy || '',
    'Updated Date': formatDateDDMMYYYY(r.updatedDate || r.updatedOn),
    'Updated By': r.updatedBy || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');

  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filenamePrefix}-${dateStamp}.xlsx`);
};
