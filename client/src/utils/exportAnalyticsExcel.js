import * as XLSX from 'xlsx';
import { RecruitmentStatus } from './statusMaster';

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
};

const statusLabel = (code) => RecruitmentStatus[Number(code)] ?? '';

export const exportAnalyticsToExcel = (records, filenamePrefix = 'analytics-export') => {
  const rows = records.map((r) => ({
    'ID Number': r.idnumber || '',
    'Company Name': r.companyName || '',
    'Domain Vertical': r.domain || '',
    Location: r.location || '',
    'Resource Person': r.resourcePerson || '',
    'Mobile Number': r.contactNumber || '',
    Status: statusLabel(r.status),
    Description: r.description || '',
    'Portal Link': r.portalLink || '',
    'Updated On': formatDate(r.updatedOn),
    'Updated By': r.updatedBy || '',
    'Created At': formatDate(r.createdAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics');

  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filenamePrefix}-${dateStamp}.xlsx`);
};
