import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  History, 
  CheckSquare, 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp, 
  ChevronDown,
  X,
  FileText,
  Download
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../api';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import { exportAnalyticsToExcel } from '../utils/exportAnalyticsExcel';
import {
  isValidContactNumber,
  normalizeContactNumber,
  sanitizeContactNumberInput,
} from '../utils/contactNumber';
import { isValidEmail, normalizeEmail } from '../utils/email';
import { recruitmentFilterOptions, RECRUITMENT_STATUS } from '../utils/statusMaster';
import StatusBadge from '../components/StatusBadge';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/dateFormatter';

const Analytics = () => {
  // State for candidates list & meta
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ageFilter, setAgeFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { user } = useAuth();
  const isAdmin = user?.email === 'admin@elitehire.com';
  
  // Sorting state
  const [sortBy, setSortBy] = useState('updatedOn');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals visibility state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form selections and data fields
  const [activeRecord, setActiveRecord] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Candidate input form state
  const [formData, setFormData] = useState({
    idnumber: '',
    companyName: '',
    domain: '',
    location: '',
    email: '',
    contactNumber: '',
    resourcePerson: '',
    portalLink: '',
    status: '',
    description: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Status updating form state
  const [statusForm, setStatusForm] = useState({
    status: '',
    description: ''
  });

  // Fetch list of records from backend API
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/analytics', {
        params: {
          page,
          limit,
          search,
          status: statusFilter,
          age: ageFilter === 'All' ? '' : ageFilter,
          location: locationFilter,
          sortBy,
          sortOrder
        }
      });
      setRecords(data.records);
      setTotalPages(data.pagination.totalPages);
      setTotalRecords(data.pagination.totalRecords);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load candidate metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, limit, statusFilter, ageFilter, locationFilter, sortBy, sortOrder]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRecords();
  };

  // Trigger sort modification
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const hasActiveFilters = Boolean(search || statusFilter || ageFilter !== 'All' || locationFilter);

  const fetchAllRecordsForExport = async () => {
    const pageSize = 100;
    const filterParams = {
      search,
      status: statusFilter,
      age: ageFilter === 'All' ? '' : ageFilter,
      location: locationFilter,
      sortBy,
      sortOrder,
    };
    const allRecords = [];
    let currentPage = 1;
    let pagesToFetch = 1;

    do {
      const { data } = await api.get('/analytics', {
        params: {
          page: currentPage,
          limit: pageSize,
          ...filterParams,
        },
      });
      allRecords.push(...(data.records || []));
      pagesToFetch = data.pagination?.totalPages || 1;
      currentPage += 1;
    } while (currentPage <= pagesToFetch);

    return allRecords;
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

      const filenamePrefix = hasActiveFilters ? 'analytics-filtered' : 'analytics-all';
      exportAnalyticsToExcel(exportRecords, filenamePrefix);
      toast.success(
        hasActiveFilters
          ? `Exported ${exportRecords.length} filtered record(s) to Excel.`
          : `Exported ${exportRecords.length} record(s) to Excel.`
      );
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to export records.');
    } finally {
      setExporting(false);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setAgeFilter('All');
    setLocationFilter('');
    setPage(1);
  };

  // Open Create Form modal
  const handleAddClick = () => {
    setActiveRecord(null);
    setFormData({
      idnumber: '',
      companyName: '',
      domain: '',
      location: '',
      email: '',
      contactNumber: '',
      resourcePerson: '',
      portalLink: '',
      status: '',
      description: '',
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  // Open Edit Form modal
  const handleEditClick = (record) => {
    setActiveRecord(record);
    setFormData({
      idnumber: record.idnumber || '',
      companyName: record.companyName || '',
      domain: record.domain || '',
      location: record.location || '',
      email: record.email || '',
      contactNumber: normalizeContactNumber(record.contactNumber),
      resourcePerson: record.resourcePerson || '',
      portalLink: record.portalLink || '',
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.companyName.trim()) {
      errors.companyName = 'Company name is required';
    }
    if (!formData.domain.trim()) {
      errors.domain = 'Domain is required';
    }
    if (!formData.location.trim()) {
      errors.location = 'Location is required';
    }
    if (!isValidEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!isValidContactNumber(formData.contactNumber)) {
      errors.contactNumber = 'Mobile number must be exactly 10 digits';
    }
    if (!activeRecord && formData.status === '') {
      errors.status = 'Status is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create or Update candidate record handler
  const handleAddEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the highlighted form errors.');
      return;
    }

    const payload = {
      ...formData,
      companyName: formData.companyName.trim(),
      domain: formData.domain.trim(),
      location: formData.location.trim(),
      email: normalizeEmail(formData.email),
      contactNumber: formData.contactNumber,
      resourcePerson: formData.resourcePerson.trim(),
      portalLink: formData.portalLink.trim(),
    };

    try {
      if (activeRecord) {
        // Edit record
        await api.put(`/analytics/${activeRecord._id}`, payload);
        toast.success('Record modified successfully!');
      } else {
        // Create record: exclude empty idnumber so backend computes the sequential value
        const { idnumber, ...submitData } = payload;
        await api.post('/analytics', submitData);
        toast.success('Record created successfully!');
      }
      setIsAddEditOpen(false);
      fetchRecords();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error processing record.';
      toast.error(errorMsg);
    }
  };

  // Open Delete confirmation dialog
  const handleDeleteClick = (record) => {
    setActiveRecord(record);
    setIsDeleteOpen(true);
  };

  // Delete Candidate record
  const confirmDelete = async () => {
    try {
      await api.delete(`/analytics/${activeRecord._id}`);
      toast.success('Record deleted.');
      setIsDeleteOpen(false);
      fetchRecords();
    } catch (error) {
      toast.error('Failed to remove record.');
    }
  };

  // Open Update Status Modal
  const handleUpdateStatusClick = (record) => {
    setActiveRecord(record);
    setStatusForm({
      status: record.status ?? '',
      description: ''
    });
    setIsStatusOpen(true);
  };

  // Submit new candidate status
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!statusForm.description.trim()) {
      toast.error('Please specify a description or reasoning for status update');
      return;
    }
    try {
      await api.put(`/analytics/update-status/${activeRecord._id}`, statusForm);
      toast.success('Status updated!');
      setIsStatusOpen(false);
      fetchRecords();
    } catch (error) {
      toast.error('Failed to update status.');
    }
  };

  // Open Status History audit trail modal
  const handleHistoryClick = async (record) => {
    setActiveRecord(record);
    setHistoryLoading(true);
    setIsHistoryOpen(true);
    try {
      const { data } = await api.get(`/analytics/history/${record._id}`);
      setHistoryList(data);
    } catch (error) {
      toast.error('Could not fetch status history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Consultancy Sourcing Log</h1>
          <p className="text-xs text-slate-500">Configure parameters, verify candidates, and track action audit trails</p>
        </div>
        <button
          onClick={handleAddClick}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-brand-800 to-blue-700 hover:from-brand-700 hover:to-blue-600 text-white font-bold text-xs rounded-xl shadow-glow-brand transition-all uppercase tracking-wider"
        >
          <Plus size={16} />
          <span>Add Info</span>
        </button>
      </div>

      {/* Filter and Search Form */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
          {/* Search Box */}
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

          {/* Status filter */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Filter Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
            >
              <option value="">Select</option>
              {recruitmentFilterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Age Filter */}
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

          {/* Actions & Clear */}
          <div className="flex items-center space-x-2">
            <button
              type="submit"
              className="flex-1 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Search
            </button>
            {(search || statusFilter || ageFilter !== 'All' || locationFilter) && (
              <button
                type="button"
                onClick={resetFilters}
                className="p-2 bg-red-50 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-xs"
                title="Clear Filters"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Entries Control & Total Count Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-medium">Show</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value));
                setPage(1);
              }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-brand-800 font-bold"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-slate-500 font-medium">entries</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || totalRecords === 0}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all shadow-sm w-full sm:w-auto"
            title={hasActiveFilters ? 'Export filtered records to Excel' : 'Export all records to Excel'}
          >
            {exporting ? <Spinner size="small" /> : <Download size={14} />}
            <span>{exporting ? 'Exporting...' : 'Export Excel'}</span>
          </button>
          <div className="text-slate-500 text-[11px] font-bold tracking-wide uppercase text-center bg-slate-50 sm:bg-transparent border border-slate-150 sm:border-0 px-3 py-2 rounded-xl sm:p-0">
            Total Records: <span className="font-extrabold text-brand-800 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-100">{totalRecords}</span>
          </div>
        </div>
      </div>

      {/* Main Records Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Spinner />
          </div>
        ) : records.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <FileText size={48} className="text-slate-300 mx-auto" />
            <p className="text-slate-500 text-sm font-semibold">No candidates logged in this database</p>
            <p className="text-xs text-slate-400">Try modifying your query or adding new records.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-extrabold tracking-wider text-slate-500">
                  <th onClick={() => handleSort('idnumber')} className="px-6 py-4 cursor-pointer hover:text-slate-800 whitespace-nowrap min-w-[120px]">
                    <div className="flex items-center space-x-1">
                      <span>ID Number</span>
                      {sortBy === 'idnumber' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('domain')} className="px-6 py-4 cursor-pointer hover:text-slate-800">
                    <div className="flex items-center space-x-1">
                      <span>Domain Vertical</span>
                      {sortBy === 'domain' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('companyName')} className="px-6 py-4 cursor-pointer hover:text-slate-800">
                    <div className="flex items-center space-x-1">
                      <span>Company Name</span>
                      {sortBy === 'companyName' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Resource Info</th>
                  <th className="px-6 py-4">Status</th>
                  <th onClick={() => handleSort('updatedOn')} className="px-6 py-4 cursor-pointer hover:text-slate-800">
                    <div className="flex items-center space-x-1">
                      <span>Updated On</span>
                      {sortBy === 'updatedOn' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-xs">
                {records.map((r) => (
                  <tr key={r._id} className={`transition-colors ${r.ageInDays >= 25 && r.ageInDays <= 30 ? 'table-warning bg-[#fff3cd] hover:bg-[#ffe69c]' : 'hover:bg-slate-50/60'}`}>
                    <td className="px-6 py-4 font-extrabold text-brand-800 whitespace-nowrap min-w-[120px]">{r.idnumber}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{r.domain}</td>
                    <td className="px-6 py-4 text-slate-700 font-medium">{r.companyName || '—'}</td>
                    <td className="px-6 py-4 text-slate-600">{r.location}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="font-semibold text-slate-800">{r.resourcePerson || '—'}</div>
                      {r.email && (
                        <div className="text-[10px] text-slate-500 truncate max-w-[140px]" title={r.email}>
                          {r.email}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-450">{normalizeContactNumber(r.contactNumber) || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={r.status} type="recruitment" />
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <div className="text-[10px] text-slate-700 font-medium">{formatDateDDMMYYYY(r.updatedOn)}</div>
                      <div className="text-[9px] text-slate-400">By {r.updatedBy}</div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Edit Action */}
                        <button
                          onClick={() => handleEditClick(r)}
                          className="p-1.5 bg-slate-50 border border-slate-200 hover:border-brand-300 hover:text-brand-800 hover:bg-brand-50 rounded-lg transition-all text-slate-500"
                          title="Edit Main Fields"
                        >
                          <Edit2 size={13} />
                        </button>
                        {/* Delete Action */}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteClick(r)}
                            className="p-1.5 bg-slate-50 border border-slate-200 hover:border-red-300 hover:text-red-650 hover:bg-red-50 rounded-lg transition-all text-slate-500"
                            title="Delete Candidate"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                        {/* Update Status Trigger */}
                        <button
                          onClick={() => handleUpdateStatusClick(r)}
                          className="p-1.5 bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all text-slate-500"
                          title="Update Workflow Status"
                        >
                          <CheckSquare size={13} />
                        </button>
                        {/* Audit Trail Trail */}
                        <button
                          onClick={() => handleHistoryClick(r)}
                          className="p-1.5 bg-slate-50 border border-slate-200 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all text-slate-500"
                          title="Show Sourcing Audit Trails"
                        >
                          <History size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Paginations */}
        {!loading && records.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-200 bg-slate-50/50">
            <span className="text-xs text-slate-500 text-center sm:text-left">
              Showing <span className="font-semibold text-slate-800">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-slate-800">
                {Math.min(page * limit, totalRecords)}
              </span>{' '}
              of <span className="font-semibold text-slate-800">{totalRecords}</span> candidates
            </span>
            <div className="flex items-center justify-center space-x-1.5 w-full sm:w-auto">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all shadow-xs"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-bold px-3 py-1 bg-slate-105 border border-slate-200 text-slate-700 rounded-lg">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all shadow-xs"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 1. CREATE / EDIT CANDIDATE MODAL */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={activeRecord ? `Modify Candidate: ${formData.idnumber}` : 'Add Info to Log'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAddEditSubmit} className="space-y-4 text-slate-800">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Company Name *</label>
            <input
              type="text"
              required
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
            />
            {formErrors.companyName && (
              <p className="text-[10px] text-red-600 mt-1">{formErrors.companyName}</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Domain Vertical *</label>
            <input
              type="text"
              required
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
            />
            {formErrors.domain && (
              <p className="text-[10px] text-red-600 mt-1">{formErrors.domain}</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Location *</label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
            />
            {formErrors.location && (
              <p className="text-[10px] text-red-600 mt-1">{formErrors.location}</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
            />
            {formErrors.email && (
              <p className="text-[10px] text-red-600 mt-1">{formErrors.email}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Mobile Number</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={formData.contactNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contactNumber: sanitizeContactNumberInput(e.target.value),
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
              />
              {formErrors.contactNumber && (
                <p className="text-[10px] text-red-600 mt-1">{formErrors.contactNumber}</p>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Resource Person</label>
              <input
                type="text"
                value={formData.resourcePerson}
                onChange={(e) => setFormData({ ...formData, resourcePerson: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Portal Sourcing Link</label>
            <input
              type="url"
              value={formData.portalLink}
              onChange={(e) => setFormData({ ...formData, portalLink: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
            />
          </div>

          {!activeRecord && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Initial Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
                  >
                    <option value="">Select</option>
                    {recruitmentFilterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
                  </select>
                </div>
              </div>
              {formErrors.status && (
                <p className="text-[10px] text-red-600 mt-1">{formErrors.status}</p>
              )}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Log Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs animate-none"
                />
              </div>
            </>
          )}

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddEditOpen(false)}
              className="w-full sm:flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:flex-1 py-2.5 bg-gradient-to-r from-brand-800 to-blue-700 hover:from-brand-700 hover:to-blue-600 text-white font-bold text-xs rounded-xl shadow-glow-brand transition-all"
            >
              {activeRecord ? 'Save Changes' : 'Add Info'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. UPDATE STATUS MODAL */}
      <Modal
        isOpen={isStatusOpen}
        onClose={() => setIsStatusOpen(false)}
        title={`Update Status: ${activeRecord?.idnumber}`}
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4 text-slate-800">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Select Sourcing Status</label>
            <select
              value={statusForm.status}
              onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value === '' ? '' : Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
            >
              <option value="">Select</option>
              {recruitmentFilterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Workflow Notes / Reason *</label>
            <textarea
              rows={3}
              value={statusForm.description}
              onChange={(e) => setStatusForm({ ...statusForm, description: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs animate-none"
            />
          </div>

          <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsStatusOpen(false)}
              className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-sm"
            >
              Close
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-gradient-to-r from-brand-800 to-blue-700 hover:from-brand-700 hover:to-blue-600 text-white font-bold text-xs rounded-xl shadow-glow-brand"
            >
              Submit Update
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. SHOW HISTORY AUDIT TRAIL MODAL */}
      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title={`Audit Trail: ${activeRecord?.idnumber}`}
        maxWidth="max-w-md"
      >
        {historyLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Spinner />
          </div>
        ) : historyList.length === 0 ? (
          <p className="text-center text-slate-400 text-xs py-8">No status transition log records found.</p>
        ) : (
          <div className="relative border-l-2 border-slate-200 pl-4 py-1.5 ml-3 space-y-6 text-slate-800">
            {historyList.map((hist, idx) => (
              <div key={hist._id || idx} className="relative">
                {/* Node icon circle */}
                <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-brand-800 border border-white shadow-sm" />
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={hist.status} type="recruitment" />
                    <span className="text-[10px] text-slate-400 font-medium">
                      {formatDateTimeDDMMYYYY(hist.updatedOn)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                    {hist.description}
                  </p>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Updated by: <span className="text-slate-700 font-bold">{hist.updatedBy}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={() => setIsHistoryOpen(false)}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            Dismiss
          </button>
        </div>
      </Modal>

      {/* 4. CONFIRM DELETE MODAL */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Record Deletion"
      >
        <div className="space-y-4 text-slate-800">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to delete candidate <span className="font-extrabold text-brand-850">{activeRecord?.idnumber}</span>? This action is permanent and will clear all associated status history metrics.
          </p>
          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={() => setIsDeleteOpen(false)}
              className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-glow-brand"
            >
              Delete Record
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Analytics;
