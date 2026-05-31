import * as XLSX from 'xlsx';
import { RecruitmentStatus } from './statusMaster';

import { formatDateDDMMYYYY } from './dateFormatter';

const statusLabel = (code) => RecruitmentStatus[Number(code)] ?? '';

export const exportAnalyticsToExcel = (records, filenamePrefix = 'analytics-export') => {
  const rows = records.map((r) => ({
    'ID Number': r.idnumber || '',
    'Company Name': r.companyName || '',
    'Domain Vertical': r.domain || '',
    Location: r.location || '',
    Email: r.email || '',
    'Resource Person': r.resourcePerson || '',
    'Mobile Number': r.contactNumber || '',
    Status: statusLabel(r.status),
    Description: r.description || '',
    'Portal Link': r.portalLink || '',
    'Updated On': formatDateDDMMYYYY(r.updatedOn),
    'Updated By': r.updatedBy || '',
    'Created At': formatDateDDMMYYYY(r.createdAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics');

  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filenamePrefix}-${dateStamp}.xlsx`);
};
