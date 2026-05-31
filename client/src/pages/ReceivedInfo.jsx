import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
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
import { exportReceivedInfoToExcel } from '../utils/exportReceivedInfoExcel';
import {
  isValidContactNumber,
  normalizeContactNumber,
  sanitizeContactNumberInput,
} from '../utils/contactNumber';
import { isValidEmail, normalizeEmail } from '../utils/email';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

const ReceivedInfo = () => {
  // State for received records & meta
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { user } = useAuth();
  const isAdmin = user?.email === 'admin@elitehire.com';
  
  // Sorting state
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals visibility state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form selections and data fields
  const [activeRecord, setActiveRecord] = useState(null);

  // Received input form state
  const [formData, setFormData] = useState({
    requestId: '',
    companyName: '',
    domain: '',
    location: '',
    email: '',
    mobileNumber: '',
    resourceName: '',
    vendor: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const vendorOptions = ['HR Circle', 'Talvixa', 'Job Updates', 'RedBus', 'Other Vendor'];

  // Fetch list of records from backend API
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/received-info', {
        params: {
          page,
          limit,
          search,
          vendor: vendorFilter,
          domain: domainFilter,
          location: locationFilter,
          sortBy,
          sortOrder
        }
      });
      setRecords(data.records);
      setTotalPages(data.pagination.totalPages);
      setTotalRecords(data.pagination.totalRecords);
    } catch (error) {
      console.error('Error loading received info:', error);
      toast.error('Failed to load received info records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, limit, vendorFilter, domainFilter, locationFilter, sortBy, sortOrder]);

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

  const hasActiveFilters = Boolean(search || vendorFilter || domainFilter || locationFilter);

  const fetchAllRecordsForExport = async () => {
    const pageSize = 100;
    const filterParams = {
      search,
      vendor: vendorFilter,
      domain: domainFilter,
      location: locationFilter,
      sortBy,
      sortOrder,
    };
    const allRecords = [];
    let currentPage = 1;
    let pagesToFetch = 1;

    do {
      const { data } = await api.get('/received-info', {
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

      const filenamePrefix = hasActiveFilters ? 'received-info-filtered' : 'received-info-all';
      exportReceivedInfoToExcel(exportRecords, filenamePrefix);
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
    setVendorFilter('');
    setDomainFilter('');
    setLocationFilter('');
    setPage(1);
  };

  // Open Create Form modal
  const handleAddClick = () => {
    setActiveRecord(null);
    setFormData({
      requestId: '',
      companyName: '',
      domain: '',
      location: '',
      email: '',
      mobileNumber: '',
      resourceName: '',
      vendor: '',
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  // Open Edit Form modal
  const handleEditClick = (record) => {
    setActiveRecord(record);
    setFormData({
      requestId: record.requestId || '',
      companyName: record.companyName || '',
      domain: record.domain || '',
      location: record.location || '',
      email: record.email || '',
      mobileNumber: normalizeContactNumber(record.mobileNumber),
      resourceName: record.resourceName || '',
      vendor: record.vendor || '',
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
    if (!formData.resourceName.trim()) {
      errors.resourceName = 'Resource name is required';
    }
    if (!isValidEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!isValidContactNumber(formData.mobileNumber)) {
      errors.mobileNumber = 'Mobile number must be exactly 10 digits';
    }
    if (!formData.vendor) {
      errors.vendor = 'Vendor selection is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create or Update record handler
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
      mobileNumber: formData.mobileNumber,
      resourceName: formData.resourceName.trim(),
      vendor: formData.vendor,
    };

    try {
      if (activeRecord) {
        // Edit record
        await api.put(`/received-info/${activeRecord._id}`, payload);
        toast.success('Record modified successfully!');
      } else {
        // Create record: exclude empty requestId so backend computes sequential value
        const { requestId, ...submitData } = payload;
        await api.post('/received-info', submitData);
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

  // Delete record
  const confirmDelete = async () => {
    try {
      await api.delete(`/received-info/${activeRecord._id}`);
      toast.success('Record deleted.');
      setIsDeleteOpen(false);
      fetchRecords();
    } catch (error) {
      toast.error('Failed to remove record.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Received Sourcing Log</h1>
          <p className="text-xs text-slate-500">Configure parameters, verify incoming request leads, and manage records</p>
        </div>
        <button
          onClick={handleAddClick}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-brand-800 to-blue-700 hover:from-brand-700 hover:to-blue-600 text-white font-bold text-xs rounded-xl shadow-glow-brand transition-all uppercase tracking-wider"
        >
          <Plus size={16} />
          <span>Add Record</span>
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

          {/* Vendor filter */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Filter Vendor</label>
            <select
              value={vendorFilter}
              onChange={(e) => { setVendorFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
            >
              <option value="">Select</option>
              {vendorOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Domain Filter */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Domain Category</label>
            <input
              type="text"
              value={domainFilter}
              onChange={(e) => { setDomainFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
            />
          </div>

          {/* Actions & Clear */}
          <div className="flex items-center space-x-2">
            <button
              type="submit"
              className="flex-1 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Search
            </button>
            {hasActiveFilters && (
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
            <p className="text-slate-500 text-sm font-semibold">No received logs in this database</p>
            <p className="text-xs text-slate-400">Try modifying your query or adding new records.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-extrabold tracking-wider text-slate-500">
                  <th onClick={() => handleSort('requestId')} className="px-6 py-4 cursor-pointer hover:text-slate-800 whitespace-nowrap min-w-[120px]">
                    <div className="flex items-center space-x-1">
                      <span>Request ID</span>
                      {sortBy === 'requestId' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('domain')} className="px-6 py-4 cursor-pointer hover:text-slate-800">
                    <div className="flex items-center space-x-1">
                      <span>Domain</span>
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
                  <th className="px-6 py-4">Vendor</th>
                  <th onClick={() => handleSort('createdAt')} className="px-6 py-4 cursor-pointer hover:text-slate-800">
                    <div className="flex items-center space-x-1">
                      <span>Created Date</span>
                      {sortBy === 'createdAt' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-xs">
                {records.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-extrabold text-brand-800 whitespace-nowrap min-w-[120px]">{r.requestId}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{r.domain}</td>
                    <td className="px-6 py-4 text-slate-700 font-medium">{r.companyName || '—'}</td>
                    <td className="px-6 py-4 text-slate-600">{r.location}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="font-semibold text-slate-800">{r.resourceName || '—'}</div>
                      {r.email && (
                        <div className="text-[10px] text-slate-500 truncate max-w-[140px]" title={r.email}>
                          {r.email}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-450">{normalizeContactNumber(r.mobileNumber) || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-800 uppercase tracking-wide border border-slate-200">
                        {r.vendor}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <div className="text-[10px] text-slate-700 font-medium">{formatDateDDMMYYYY(r.createdAt)}</div>
                      <div className="text-[9px] text-slate-400">By {r.updatedBy}</div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Edit Action */}
                        <button
                          onClick={() => handleEditClick(r)}
                          className="p-1.5 bg-slate-50 border border-slate-200 hover:border-brand-300 hover:text-brand-800 hover:bg-brand-50 rounded-lg transition-all text-slate-500"
                          title="Edit Lead Fields"
                        >
                          <Edit2 size={13} />
                        </button>
                        {/* Delete Action */}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteClick(r)}
                            className="p-1.5 bg-slate-50 border border-slate-200 hover:border-red-300 hover:text-red-650 hover:bg-red-50 rounded-lg transition-all text-slate-500"
                            title="Delete Lead"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
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
              of <span className="font-semibold text-slate-800">{totalRecords}</span> entries
            </span>
            <div className="flex items-center space-x-1.5">
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

      {/* 1. CREATE / EDIT LEAD MODAL */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={activeRecord ? `Modify Lead Request: ${formData.requestId}` : 'Add Sourcing Lead'}
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
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Resource Name *</label>
            <input
              type="text"
              required
              value={formData.resourceName}
              onChange={(e) => setFormData({ ...formData, resourceName: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
            />
            {formErrors.resourceName && (
              <p className="text-[10px] text-red-600 mt-1">{formErrors.resourceName}</p>
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
                value={formData.mobileNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    mobileNumber: sanitizeContactNumberInput(e.target.value),
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
              />
              {formErrors.mobileNumber && (
                <p className="text-[10px] text-red-600 mt-1">{formErrors.mobileNumber}</p>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Vendor *</label>
              <select
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
              >
                <option value="">Select</option>
                {vendorOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {formErrors.vendor && (
                <p className="text-[10px] text-red-600 mt-1">{formErrors.vendor}</p>
              )}
            </div>
          </div>

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
              {activeRecord ? 'Save Changes' : 'Add Lead'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. CONFIRM DELETE MODAL */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Lead Deletion"
      >
        <div className="space-y-4 text-slate-800">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to delete lead <span className="font-extrabold text-brand-850">{activeRecord?.requestId}</span>? This action is permanent and will clear the sourcing details.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => setIsDeleteOpen(false)}
              className="w-full sm:flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="w-full sm:flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-glow-brand"
            >
              Delete Lead
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReceivedInfo;
