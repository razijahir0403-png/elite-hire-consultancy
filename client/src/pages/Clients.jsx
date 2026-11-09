import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Home,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
  FileText,
  Download,
  Eye,
} from 'lucide-react';
import api from '../api';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import { exportClientsToExcel } from '../utils/exportClientsExcel';
import {
  isValidContactNumber,
  normalizeContactNumber,
  sanitizeContactNumberInput,
} from '../utils/contactNumber';
import { isValidEmail, normalizeEmail } from '../utils/email';
import { clientFilterOptions, CLIENT_STATUS } from '../utils/clientStatusMaster';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/dateFormatter';

const TEXT_FIELD_MAX_LENGTH = 200;

const emptyForm = () => ({
  clientName: '',
  mobile: '',
  email: '',
  category: '',
  status: '',
  description: '',
});

const Clients = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ageFilter, setAgeFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { user, isAdmin } = useAuth();
  const [sortBy, setSortBy] = useState('updatedOn');
  const [sortOrder, setSortOrder] = useState('desc');

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [activeRecord, setActiveRecord] = useState(null);

  const [formData, setFormData] = useState(emptyForm());
  const [formErrors, setFormErrors] = useState({});

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/clients', {
        params: {
          page,
          limit,
          search,
          status: statusFilter,
          age: ageFilter === 'All' ? '' : ageFilter,
          sortBy,
          sortOrder,
        },
      });
      setRecords(data.records);
      setTotalPages(data.pagination.totalPages);
      setTotalRecords(data.pagination.totalRecords);
    } catch {
      toast.error('Failed to load data received records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, limit, statusFilter, ageFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRecords();
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const hasActiveFilters = Boolean(search || statusFilter || ageFilter !== 'All');

  const fetchAllRecordsForExport = async () => {
    const { data } = await api.get('/clients/export', {
      params: { search, status: statusFilter, age: ageFilter === 'All' ? '' : ageFilter, sortBy, sortOrder },
    });
    return data.records || [];
  };

  const handleExportExcel = async () => {
    if (totalRecords === 0) {
      toast.info('No records to export.');
      return;
    }
    setExporting(true);
    try {
      const exportRecords = await fetchAllRecordsForExport();
      if (exportRecords.length === 0) {
        toast.info('No records to export.');
        return;
      }
      const filenamePrefix = hasActiveFilters ? 'data-received-filtered' : 'data-received-all';
      await exportClientsToExcel(exportRecords, filenamePrefix);
      toast.success(`Exported ${exportRecords.length} record(s) to Excel.`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to export records.');
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setAgeFilter('All');
    setPage(1);
  };

  const handleAddClick = () => {
    setActiveRecord(null);
    setFormData(emptyForm());
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  const handleEditClick = (record) => {
    setActiveRecord(record);
    setFormData({
      clientName: record.clientName || '',
      mobile: normalizeContactNumber(record.mobile),
      email: record.email || '',
      category: record.category || '',
      status: record.status ?? '',
      description: record.description || '',
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  const handleViewClick = (record) => {
    setActiveRecord(record);
    setIsViewOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.clientName.trim()) {
      errors.clientName = 'Company name is required';
    }
    if (!formData.category.trim()) {
      errors.category = 'Domain is required';
    } else if (formData.category.trim().length > TEXT_FIELD_MAX_LENGTH) {
      errors.category = `Domain must not exceed ${TEXT_FIELD_MAX_LENGTH} characters`;
    }
    if (!isValidEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!isValidContactNumber(formData.mobile)) {
      errors.mobile = 'Mobile number must be exactly 10 digits';
    }
    if (!activeRecord && formData.status === '') {
      errors.status = 'Status is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildSubmitFormData = () => {
    const fd = new FormData();
    fd.append('clientName', formData.clientName.trim());
    fd.append('mobile', formData.mobile);
    fd.append('email', normalizeEmail(formData.email));
    fd.append('category', formData.category.trim());
    if (!activeRecord) {
      fd.append('status', String(formData.status));
      fd.append('description', formData.description.trim() || 'Initial client record creation');
    }
    return fd;
  };

  const handleAddEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the highlighted form errors.');
      return;
    }
    try {
      const fd = buildSubmitFormData();
      if (activeRecord) {
        await api.put(`/clients/${activeRecord._id}`, fd);
        toast.success('Data Received record updated successfully!');
      } else {
        await api.post('/clients', fd);
        toast.success('Data Received record created successfully!');
      }
      setIsAddEditOpen(false);
      fetchRecords();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error processing record.');
    }
  };

  const handleDeleteClick = (record) => {
    setActiveRecord(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/clients/${activeRecord._id}`);
      toast.success('Data Received record deleted.');
      setIsDeleteOpen(false);
      fetchRecords();
    } catch {
      toast.error('Failed to remove record.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Data Received</h1>
          <p className="text-xs text-slate-500">Manage received data, documents, and workflow status history</p>
        </div>
        <button
          type="button"
          onClick={handleAddClick}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-[#00D98B] to-[#00B96B] hover:from-[#00E99A] hover:to-[#00D98B] text-[#07566A] font-extrabold text-xs rounded-xl shadow-[0_4px_14px_rgba(0,217,139,0.3)] hover:shadow-[0_6px_18px_rgba(0,217,139,0.4)] transition-all uppercase tracking-wider active:scale-[0.98]"
        >
          <Plus size={16} />
          <span>Add Info</span>
        </button>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
          <div className="space-y-1.5 col-span-1 sm:col-span-2">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Search Keyword</label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Filter Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 text-xs"
            >
              <option value="">Select</option>
              {clientFilterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Age</label>
            <select
              value={ageFilter}
              onChange={(e) => { setAgeFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
            >
              <option value="All">All</option>
              <option value="Today">Today</option>
              <option value="> 5 Days">&gt; 5 Days</option>
              <option value="> 15 Days">&gt; 15 Days</option>
              <option value="> 25 Days">&gt; 25 Days</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button type="submit" className="flex-1 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold">
              Search
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="p-2 bg-red-50 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white rounded-xl"
                title="Clear Filters"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-sm text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-slate-500 font-medium">Show</span>
          <select
            value={limit}
            onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-slate-500 font-medium">entries</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || totalRecords === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-[11px] font-bold uppercase"
          >
            {exporting ? <Spinner size="small" /> : <Download size={14} />}
            <span>{exporting ? 'Exporting...' : 'Export Excel'}</span>
          </button>
          <div className="text-slate-500 text-[11px] font-bold uppercase">
            Total Records:{' '}
            <span className="font-extrabold text-brand-800 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-100">
              {totalRecords}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Spinner />
          </div>
        ) : records.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <FileText size={48} className="text-slate-300 mx-auto" />
            <p className="text-slate-500 text-sm font-semibold">No records found</p>
          </div>
        ) : (
          <div className="responsive-table-container w-full max-w-full overflow-x-auto">
            <table className="w-max min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#07566A] text-white text-[10px] uppercase font-extrabold tracking-wider">
                  <th onClick={() => handleSort('clientId')} className="px-6 py-4 cursor-pointer hover:text-[#00D98B] whitespace-nowrap min-w-[130px]">
                    <div className="flex items-center space-x-1">
                      <span>Client ID</span>
                      {sortBy === 'clientId' && (sortOrder === 'asc' ? <ChevronUp size={12} className="text-[#00D98B]" /> : <ChevronDown size={12} className="text-[#00D98B]" />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('clientName')} className="px-6 py-4 cursor-pointer hover:text-[#00D98B] whitespace-nowrap min-w-[160px]">
                    <div className="flex items-center space-x-1">
                      <span>Client Name</span>
                      {sortBy === 'clientName' && (sortOrder === 'asc' ? <ChevronUp size={12} className="text-[#00D98B]" /> : <ChevronDown size={12} className="text-[#00D98B]" />)}
                    </div>
                  </th>
                  <th className="px-6 py-4 whitespace-nowrap min-w-[130px]">Mobile</th>
                  <th className="px-6 py-4 whitespace-nowrap min-w-[160px]">Email</th>
                  <th className="px-6 py-4 whitespace-nowrap min-w-[120px]">Category</th>
                  <th className="px-6 py-4 whitespace-nowrap min-w-[130px]">Status</th>
                  <th onClick={() => handleSort('updatedOn')} className="px-6 py-4 cursor-pointer hover:text-[#00D98B] whitespace-nowrap min-w-[140px]">
                    <div className="flex items-center space-x-1">
                      <span>Updated On</span>
                      {sortBy === 'updatedOn' && (sortOrder === 'asc' ? <ChevronUp size={12} className="text-[#00D98B]" /> : <ChevronDown size={12} className="text-[#00D98B]" />)}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right whitespace-nowrap min-w-[130px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-xs">
                {records.map((r) => (
                  <tr key={r._id} className={`transition-colors ${r.ageInDays >= 25 ? 'warning-row' : 'hover:bg-[#D9FFF0]/25'}`}>
                    <td className="px-6 py-4 font-extrabold text-brand-800 whitespace-nowrap min-w-[130px]">{r.clientId}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap min-w-[160px]">{r.clientName}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap min-w-[130px]">{normalizeContactNumber(r.mobile) || '—'}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap min-w-[160px]">{r.email || '—'}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap min-w-[120px]">{r.category || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap min-w-[130px]">
                      <StatusBadge status={r.status} type="client" />
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap min-w-[140px]">
                      <div className="text-[10px] text-slate-700 font-medium">{formatDateDDMMYYYY(r.updatedDate || r.updatedOn || r.createdDate || r.createdAt)}</div>
                      <div className="text-[9px] text-slate-400">By {r.updatedBy || r.createdBy || 'System'}</div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap min-w-[130px]">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button type="button" onClick={() => handleViewClick(r)} className="p-1.5 bg-slate-50 border border-slate-200 hover:border-slate-400 rounded-lg text-slate-500" title="View">
                          <Eye size={13} />
                        </button>
                        <button type="button" onClick={() => handleEditClick(r)} className="p-1.5 bg-slate-50 border border-slate-200 hover:border-brand-300 hover:text-brand-800 rounded-lg text-slate-500" title="Edit">
                          <Edit2 size={13} />
                        </button>
                        {isAdmin && (
                          <button type="button" onClick={() => handleDeleteClick(r)} className="p-1.5 bg-slate-50 border border-slate-200 hover:border-red-300 hover:text-red-600 rounded-lg text-slate-500" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/clients/${r._id}/audit-trail`)}
                          className="p-1.5 bg-slate-50 border border-slate-200 hover:border-[#00B96B] hover:text-[#07566A] hover:bg-[#D5F5E7] rounded-lg transition-all text-slate-500"
                          title="Open Sourcing Audit Trail"
                        >
                          <Home size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && records.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
            <span className="text-xs text-slate-500 text-center sm:text-left">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} records
            </span>
            <div className="flex items-center space-x-1.5">
              <button type="button" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1} className="p-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-50">
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-bold px-3 py-1 border border-slate-200 rounded-lg">Page {page} of {totalPages}</span>
              <button type="button" onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages} className="p-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-50">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={activeRecord ? `Edit Record: ${activeRecord.clientId}` : 'Add Data Received'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAddEditSubmit} className="space-y-4 text-slate-800">
          {activeRecord && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Client ID</label>
              <input type="text" value={activeRecord.clientId} disabled className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500" />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Client Name *</label>
            <input
              type="text"
              required
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
            />
            {formErrors.clientName && <p className="text-[10px] text-red-600 mt-1">{formErrors.clientName}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Mobile Number</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: sanitizeContactNumberInput(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
              />
              {formErrors.mobile && <p className="text-[10px] text-red-600 mt-1">{formErrors.mobile}</p>}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs"
              />
              {formErrors.email && <p className="text-[10px] text-red-600 mt-1">{formErrors.email}</p>}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Category *</label>
            <input
              type="text"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
            />
            {formErrors.category && <p className="text-[10px] text-red-600 mt-1">{formErrors.category}</p>}
          </div>

          {!activeRecord && (
            <>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Initial Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
                >
                  <option value="">Select</option>
                  {clientFilterOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {formErrors.status && <p className="text-[10px] text-red-600 mt-1">{formErrors.status}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Log Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsAddEditOpen(false)} className="w-full sm:flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold">
              Cancel
            </button>
            <button type="submit" className="w-full sm:flex-1 py-2.5 bg-gradient-to-r from-[#00D98B] to-[#00B96B] hover:from-[#00E99A] hover:to-[#00D98B] text-[#07566A] font-extrabold text-xs rounded-xl shadow-[0_4px_14px_rgba(0,217,139,0.3)] transition-all active:scale-[0.98]">
              {activeRecord ? 'Save Changes' : 'Add Info'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={`Client: ${activeRecord?.clientId}`} maxWidth="max-w-md">
        {activeRecord && (
          <div className="space-y-3 text-xs text-slate-700">
            <p><span className="font-bold text-slate-500">Name:</span> {activeRecord.clientName}</p>
            <p><span className="font-bold text-slate-500">Mobile:</span> {normalizeContactNumber(activeRecord.mobile) || '—'}</p>
            <p><span className="font-bold text-slate-500">Email:</span> {activeRecord.email || '—'}</p>
            <p><span className="font-bold text-slate-500">Category:</span> {activeRecord.category || '—'}</p>
            <p className="flex items-center gap-2">
              <span className="font-bold text-slate-500">Status:</span>
              <StatusBadge status={activeRecord.status} type="client" />
            </p>
            <p><span className="font-bold text-slate-500">Created:</span> {formatDateTimeDDMMYYYY(activeRecord.createdDate || activeRecord.createdAt)}</p>
            <p><span className="font-bold text-slate-500">Updated by:</span> {activeRecord.updatedBy}</p>
          </div>
        )}
      </Modal>

      {/* Delete */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirm Deletion">
        <p className="text-xs text-slate-600 mb-4">
          Delete record <span className="font-bold text-brand-800">{activeRecord?.clientId}</span>?
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={() => setIsDeleteOpen(false)} className="w-full sm:flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold">Cancel</button>
          <button type="button" onClick={confirmDelete} className="w-full sm:flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold">Delete</button>
        </div>
      </Modal>
    </div>
  );
};

export default Clients;
