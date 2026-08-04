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
  Download,
  Clock
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../api';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import { exportEmployeesToExcel } from '../utils/exportEmployeesExcel';
import {
  isValidContactNumber,
  normalizeContactNumber,
  sanitizeContactNumberInput,
} from '../utils/contactNumber';
import { isValidEmail, normalizeEmail } from '../utils/email';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';
import { Navigate } from 'react-router-dom';

const Employees = () => {
  const { user } = useAuth();
  const isAdmin = ['admin@elitehire.com', 'dev@elitehire.com'].includes(user?.email);

  // State for employees list & meta
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Sorting state
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals visibility state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isTrackOpen, setIsTrackOpen] = useState(false);

  // Tracking state
  const [attendanceData, setAttendanceData] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [trackMonth, setTrackMonth] = useState(new Date().getMonth() + 1);
  const [trackYear, setTrackYear] = useState(new Date().getFullYear());
  const [isSessionHistoryOpen, setIsSessionHistoryOpen] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState([]);

  // Form selections and data fields
  const [activeRecord, setActiveRecord] = useState(null);

  // Employee input form state
  const [formData, setFormData] = useState({
    employeeCode: '',
    employeeName: '',
    dob: '',
    bloodGroup: '',
    contactNumber: '',
    email: '',
    homeAddress: '',
    domain: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Fetch list of records from backend API
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/employees', {
        params: {
          page,
          limit,
          search,
          sortBy,
          sortOrder
        }
      });
      setRecords(data.data.employees);
      setTotalPages(data.data.pagination.pages);
      setTotalRecords(data.data.pagination.total);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Failed to load employees data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchRecords();
    }
  }, [page, limit, sortBy, sortOrder]);

  // If not admin, do not render or redirect
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

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

  const hasActiveFilters = Boolean(search);

  const fetchAllRecordsForExport = async () => {
    const pageSize = 100;
    const filterParams = {
      search,
      sortBy,
      sortOrder,
    };
    const allRecords = [];
    let currentPage = 1;
    let pagesToFetch = 1;

    do {
      const { data } = await api.get('/employees', {
        params: {
          page: currentPage,
          limit: pageSize,
          ...filterParams,
        },
      });
      allRecords.push(...(data.data.employees || []));
      pagesToFetch = data.data.pagination?.pages || 1;
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

      const filenamePrefix = hasActiveFilters ? 'employees-filtered' : 'employees-all';
      exportEmployeesToExcel(exportRecords, filenamePrefix);
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
    setPage(1);
  };

  // Open Create Form modal
  const handleAddClick = () => {
    setActiveRecord(null);
    setFormData({
      employeeCode: '',
      employeeName: '',
      dob: '',
      bloodGroup: '',
      contactNumber: '',
      email: '',
      homeAddress: '',
      domain: '',
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  // Open Edit Form modal
  const handleEditClick = (record) => {
    setActiveRecord(record);
    const dobFormatted = record.dob ? new Date(record.dob).toISOString().split('T')[0] : '';
    setFormData({
      employeeCode: record.employeeCode || '',
      employeeName: record.employeeName || '',
      dob: dobFormatted,
      bloodGroup: record.bloodGroup || '',
      contactNumber: normalizeContactNumber(record.contactNumber) || '',
      email: record.email || '',
      homeAddress: record.homeAddress || '',
      domain: record.domain || '',
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.employeeName.trim()) {
      errors.employeeName = 'Employee Name is required';
    }
    if (!formData.dob) {
      errors.dob = 'Date of Birth is required';
    }
    if (!formData.domain.trim()) {
      errors.domain = 'Domain is required';
    }
    if (!isValidEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!isValidContactNumber(formData.contactNumber)) {
      errors.contactNumber = 'Contact number must be exactly 10 digits';
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
      employeeName: formData.employeeName.trim(),
      domain: formData.domain.trim(),
      bloodGroup: formData.bloodGroup.trim(),
      homeAddress: formData.homeAddress.trim(),
      email: normalizeEmail(formData.email),
      contactNumber: formData.contactNumber,
    };

    try {
      if (activeRecord) {
        // Edit record
        await api.put(`/employees/${activeRecord._id}`, payload);
        toast.success('Employee modified successfully!');
      } else {
        // Create record: exclude empty employeeCode so backend computes the sequential value
        const { employeeCode, ...submitData } = payload;
        await api.post('/employees', submitData);
        toast.success('Employee created successfully!');
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

  // Open Track Modal
  const handleTrackClick = (record) => {
    setActiveRecord(record);
    setTrackMonth(new Date().getMonth() + 1);
    setTrackYear(new Date().getFullYear());
    setIsTrackOpen(true);
  };

  // Fetch Tracking Data
  useEffect(() => {
    if (isTrackOpen && activeRecord) {
      const fetchAttendance = async () => {
        setIsTracking(true);
        try {
          const { data } = await api.get(`/attendance/history/${activeRecord.email}`, {
            params: { month: trackMonth, year: trackYear }
          });
          setAttendanceData(data.data || []);
        } catch (error) {
          toast.error('Failed to load attendance history.');
        } finally {
          setIsTracking(false);
        }
      };
      fetchAttendance();
    }
  }, [isTrackOpen, activeRecord, trackMonth, trackYear]);

  // Open Session History Modal
  const handleSessionClick = (sessions) => {
    if (!sessions) return;
    setSelectedSessions(sessions);
    setIsSessionHistoryOpen(true);
  };

  // Delete record
  const confirmDelete = async () => {
    try {
      await api.delete(`/employees/${activeRecord._id}`);
      toast.success('Employee deleted.');
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
          <h1 className="text-xl font-bold text-slate-900">Employees Info</h1>
          <p className="text-xs text-slate-500">Manage employee records, search, and export data</p>
        </div>
        <button
          onClick={handleAddClick}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-brand-800 to-blue-700 hover:from-brand-700 hover:to-blue-600 text-white font-bold text-xs rounded-xl shadow-glow-brand transition-all uppercase tracking-wider"
        >
          <Plus size={16} />
          <span>Add Employee</span>
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
                placeholder="Search by Code, Name, Email, Domain, or Contact..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            </div>
          </div>

          {/* Spacer to push actions to right like Analytics without filters */}
          <div className="hidden lg:block lg:col-span-2"></div>

          {/* Actions & Clear */}
          <div className="flex items-center space-x-2 col-span-1 sm:col-span-2 md:col-span-2 lg:col-span-1">
            <button
              type="submit"
              className="flex-1 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Search
            </button>
            {search && (
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
            <p className="text-slate-500 text-sm font-semibold">No employees logged in this database</p>
            <p className="text-xs text-slate-400">Try modifying your query or adding new records.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-extrabold tracking-wider text-slate-500">
                  <th onClick={() => handleSort('employeeCode')} className="px-6 py-4 cursor-pointer hover:text-slate-800 whitespace-nowrap min-w-[120px]">
                    <div className="flex items-center space-x-1">
                      <span>Employee Code</span>
                      {sortBy === 'employeeCode' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('employeeName')} className="px-6 py-4 cursor-pointer hover:text-slate-800">
                    <div className="flex items-center space-x-1">
                      <span>Name</span>
                      {sortBy === 'employeeName' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('domain')} className="px-6 py-4 cursor-pointer hover:text-slate-800">
                    <div className="flex items-center space-x-1">
                      <span>Domain Vertical</span>
                      {sortBy === 'domain' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th className="px-6 py-4">Contact / Email</th>
                  <th className="px-6 py-4 whitespace-nowrap min-w-[130px]">DOB / Blood Grp</th>
                  <th className="px-6 py-4">Home Address</th>
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
                  <tr key={r._id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-extrabold text-brand-800 whitespace-nowrap min-w-[120px]">{r.employeeCode}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{r.employeeName}</td>
                    <td className="px-6 py-4 text-slate-700 font-medium">{r.domain || '—'}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="font-semibold text-slate-800">{normalizeContactNumber(r.contactNumber) || '—'}</div>
                      {r.email && (
                        <div className="text-[10px] text-slate-500 truncate max-w-[140px]" title={r.email}>
                          {r.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{r.dob ? formatDateDDMMYYYY(r.dob) : '—'}</div>
                      <div className="text-[10px] text-slate-500">{r.bloodGroup || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="text-slate-500 address-cell">
                        {r.homeAddress || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <div className="text-[10px] text-slate-700 font-medium">{formatDateDDMMYYYY(r.createdAt)}</div>
                      <div className="text-[9px] text-slate-400">By {r.createdBy || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Track Action */}
                        <button
                          onClick={() => handleTrackClick(r)}
                          className="p-1.5 bg-slate-50 border border-slate-200 hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-all text-slate-500"
                          title="Track Attendance"
                        >
                          <Clock size={13} />
                        </button>
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

      {/* 1. CREATE / EDIT EMPLOYEE MODAL */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={activeRecord ? `Modify Employee: ${formData.employeeCode}` : 'Add Employee'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAddEditSubmit} className="space-y-4 text-slate-800">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Employee Code</label>
            <input
              type="text"
              disabled
              value={formData.employeeCode || 'Auto-generated'}
              className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Employee Name *</label>
            <input
              type="text"
              required
              value={formData.employeeName}
              onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
            />
            {formErrors.employeeName && (
              <p className="text-[10px] text-red-600 mt-1">{formErrors.employeeName}</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Date of Birth *</label>
            <input
              type="date"
              required
              value={formData.dob}
              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
            />
            {formErrors.dob && (
              <p className="text-[10px] text-red-600 mt-1">{formErrors.dob}</p>
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
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Email ID</label>
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
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Mobile Number *</label>
              <input
                type="text"
                required
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
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Blood Group</label>
              <input
                type="text"
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                placeholder="e.g. O+, A-, B+"
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Home Address</label>
            <textarea
              rows={3}
              value={formData.homeAddress}
              onChange={(e) => setFormData({ ...formData, homeAddress: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs animate-none"
            />
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
              {activeRecord ? 'Save Changes' : 'Add Employee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Deletion"
        maxWidth="max-w-sm"
      >
        <div className="text-center py-4">
          <Trash2 size={48} className="mx-auto text-red-500 mb-4 opacity-80" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Employee</h3>
          <p className="text-sm text-slate-500 mb-6 px-4">
            Are you sure you want to delete <span className="font-bold text-slate-700">{activeRecord?.employeeName}</span> ({activeRecord?.employeeCode})? This action cannot be undone.
          </p>
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button
              onClick={() => setIsDeleteOpen(false)}
              className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-all shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm shadow-red-200"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* TRACKING MODAL */}
      <Modal
        isOpen={isTrackOpen}
        onClose={() => setIsTrackOpen(false)}
        title="Employee Attendance History"
        maxWidth="max-w-4xl"
      >
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="text-sm font-semibold text-slate-800">
            {activeRecord?.employeeName} <span className="text-xs font-normal text-slate-500">({activeRecord?.employeeCode})</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={trackMonth}
              onChange={(e) => setTrackMonth(parseInt(e.target.value))}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-brand-800 text-xs font-bold w-full sm:w-auto"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={trackYear}
              onChange={(e) => setTrackYear(parseInt(e.target.value))}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-brand-800 text-xs font-bold w-full sm:w-auto"
            >
              {[2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {isTracking ? (
          <div className="py-20 flex items-center justify-center">
            <Spinner />
          </div>
        ) : attendanceData.length === 0 ? (
          <div className="py-20 text-center space-y-2 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
            <Clock size={32} className="text-slate-300 mx-auto" />
            <p className="text-slate-500 text-sm font-semibold">No attendance records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full border border-slate-200 rounded-xl max-h-[60vh] overflow-y-auto">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-extrabold tracking-wider text-slate-500">
                  <th className="px-4 py-3 whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 whitespace-nowrap">Day</th>
                  <th className="px-4 py-3 whitespace-nowrap">Logged In</th>
                  <th className="px-4 py-3 whitespace-nowrap">Logged Out</th>
                  <th className="px-4 py-3 whitespace-nowrap">Total Hours</th>
                  <th className="px-4 py-3 whitespace-nowrap">Work Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-xs">
                {attendanceData.map((record, index) => {
                  let rowClass = "transition-colors hover:bg-slate-50/60";
                  let statusClass = "font-medium text-slate-700";

                  if (record.status === 'Absent') {
                    rowClass = "bg-red-50/30 transition-colors hover:bg-red-50/60";
                    statusClass = "font-bold text-red-600";
                  } else if (record.status === 'Week Off') {
                    rowClass = "bg-slate-50/80 transition-colors hover:bg-slate-100";
                    statusClass = "font-medium text-slate-500";
                  } else if (record.status === 'Present') {
                    statusClass = "font-bold text-emerald-600";
                  } else if (record.status === 'Half Day') {
                    statusClass = "font-bold text-amber-600";
                  }

                  return (
                    <tr key={index} className={rowClass}>
                      <td className="px-4 py-2.5 font-bold text-slate-800 whitespace-nowrap">{record.date}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-600">{record.day}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-700">
                        {record.loggedIn !== 'N/A' ? (
                          <span
                            onClick={() => handleSessionClick(record.sessions)}
                            className="cursor-pointer hover:text-brand-800 flex items-center space-x-1 group transition-colors font-semibold text-slate-800"
                            title="View Sessions"
                          >
                            <span>{record.loggedIn}</span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">🔍</span>
                          </span>
                        ) : (
                          <span>{record.loggedIn}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-700">{record.loggedOut}</td>
                      <td className={`px-4 py-2.5 ${statusClass}`}>{record.totalHours}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-600">{record.workMode}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* LOGIN SESSION HISTORY MODAL */}
      <Modal
        isOpen={isSessionHistoryOpen}
        onClose={() => setIsSessionHistoryOpen(false)}
        title="Login Session History"
        maxWidth="max-w-2xl"
      >
        <div className="overflow-x-auto w-full border border-slate-200 rounded-xl mt-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-extrabold tracking-wider text-slate-500">
                <th className="px-4 py-3 whitespace-nowrap">Session</th>
                <th className="px-4 py-3 whitespace-nowrap">Login Time</th>
                <th className="px-4 py-3 whitespace-nowrap">Session End</th>
                <th className="px-4 py-3 whitespace-nowrap">Duration</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-xs">
              {selectedSessions.map((session, i) => (
                <tr key={i} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 font-bold text-slate-800">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-600">{session.loginTime}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-600">{session.endTime}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-600">{session.duration || 'N/A'}</td>
                  <td className="px-4 py-2.5 font-bold text-brand-700">{session.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={() => setIsSessionHistoryOpen(false)}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            Close
          </button>
        </div>
      </Modal>

    </div>
  );
};

export default Employees;
