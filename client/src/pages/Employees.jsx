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
  Clock,
  Eye,
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Users,
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
import {
  sanitizeAadhaarInput,
  isValidAadhaarNumber,
  sanitizePanInput,
  isValidPanNumber,
} from '../utils/aadhaarPan';
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
  const [isViewOpen, setIsViewOpen] = useState(false);

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
    aadhaarNumber: '',
    panNumber: '',
    contactNumber: '',
    email: '',
    homeAddress: '',
    domain: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Employee profile state for regular employee (About view)
  const [myEmployee, setMyEmployee] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Apply Leave / OD modal state (Regular Employee)
  const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);
  const [applyLeaveDate, setApplyLeaveDate] = useState('');
  const [applyLeaveDisplayDate, setApplyLeaveDisplayDate] = useState('');
  const [applyLeaveType, setApplyLeaveType] = useState('CL');
  const [applyLeaveReason, setApplyLeaveReason] = useState('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Admin Leave / OD requests management state
  const [adminTab, setAdminTab] = useState('employees'); // 'employees' | 'requests'
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveStats, setLeaveStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestStatusFilter, setRequestStatusFilter] = useState('All');
  const [requestSearch, setRequestSearch] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRequestToReject, setSelectedRequestToReject] = useState(null);
  const [adminRejectionReason, setAdminRejectionReason] = useState('');
  const [isReviewingRequest, setIsReviewingRequest] = useState(false);

  // My Leave Requests state (for regular employee)
  const [myLeaveRequests, setMyLeaveRequests] = useState([]);
  const [loadingMyRequests, setLoadingMyRequests] = useState(false);

  // Fetch leave requests for Admin
  const fetchLeaveRequests = async () => {
    setLoadingRequests(true);
    try {
      const params = {};
      if (requestStatusFilter !== 'All') {
        params.status = requestStatusFilter;
      }
      if (requestSearch.trim()) {
        params.search = requestSearch.trim();
      }
      const { data } = await api.get('/leave/all', { params });
      setLeaveRequests(data.data || []);
      if (data.stats) {
        setLeaveStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load leave requests:', error);
      toast.error('Failed to load leave requests.');
    } finally {
      setLoadingRequests(false);
    }
  };

  // Fetch my leave requests for regular employee
  const fetchMyLeaveRequests = async () => {
    setLoadingMyRequests(true);
    try {
      const { data } = await api.get('/leave/my-requests');
      setMyLeaveRequests(data.data || []);
    } catch (error) {
      console.error('Failed to load my leave requests:', error);
    } finally {
      setLoadingMyRequests(false);
    }
  };

  // Fetch current user's employee profile for About page
  const fetchMyProfile = async () => {
    setLoadingProfile(true);
    try {
      const { data } = await api.get('/employees/me');
      setMyEmployee(data.data || null);
    } catch (error) {
      console.error('Error loading employee profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Fetch list of records from backend API (Admin only)
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
      fetchLeaveRequests();
    } else {
      fetchMyProfile();
      fetchMyLeaveRequests();
    }
  }, [isAdmin, page, limit, sortBy, sortOrder]);

  useEffect(() => {
    if (isAdmin && adminTab === 'requests') {
      fetchLeaveRequests();
    }
  }, [isAdmin, adminTab, requestStatusFilter, requestSearch]);

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
      await exportEmployeesToExcel(exportRecords, filenamePrefix);
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
      aadhaarNumber: '',
      panNumber: '',
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
      aadhaarNumber: record.aadhaarNumber || '',
      panNumber: record.panNumber || '',
      contactNumber: normalizeContactNumber(record.contactNumber) || '',
      email: record.email || '',
      homeAddress: record.homeAddress || '',
      domain: record.domain || '',
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  // Open View Details modal
  const handleViewClick = (record) => {
    setActiveRecord(record);
    setIsViewOpen(true);
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
    if (formData.aadhaarNumber && !isValidAadhaarNumber(formData.aadhaarNumber)) {
      errors.aadhaarNumber = 'Aadhaar Card Number must be exactly 12 digits';
    }
    if (formData.panNumber && !isValidPanNumber(formData.panNumber)) {
      errors.panNumber = 'Invalid PAN format. Must be 5 letters, 4 digits, and 1 letter (e.g. ABCDE1234F)';
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
      aadhaarNumber: sanitizeAadhaarInput(formData.aadhaarNumber),
      panNumber: sanitizePanInput(formData.panNumber),
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

  // Fetch Tracking Data (Admin)
  useEffect(() => {
    if (isAdmin && isTrackOpen && activeRecord?.email) {
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
  }, [isAdmin, isTrackOpen, activeRecord?.email, trackMonth, trackYear]);

  // Fetch Tracking Data (Regular Employee / About View)
  useEffect(() => {
    if (!isAdmin && user?.email) {
      const fetchMyAttendance = async () => {
        setIsTracking(true);
        try {
          const { data } = await api.get(`/attendance/history/${user.email}`, {
            params: { month: trackMonth, year: trackYear }
          });
          setAttendanceData(data.data || []);
        } catch (error) {
          console.error('Failed to load attendance history:', error);
          toast.error('Failed to load attendance history.');
        } finally {
          setIsTracking(false);
        }
      };
      fetchMyAttendance();
    }
  }, [isAdmin, user?.email, trackMonth, trackYear]);

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

  // Open Apply Leave Modal
  const handleOpenApplyModal = (rawDate, displayDate) => {
    setApplyLeaveDate(rawDate);
    setApplyLeaveDisplayDate(displayDate);
    setApplyLeaveType('CL');
    setApplyLeaveReason('');
    setIsApplyLeaveOpen(true);
  };

  // Submit Leave Request
  const handleSubmitLeaveRequest = async (e) => {
    e.preventDefault();
    if (!applyLeaveType) {
      toast.error('Please select a request type.');
      return;
    }
    setIsSubmittingLeave(true);
    try {
      await api.post('/leave/apply', {
        requestDate: applyLeaveDate,
        requestType: applyLeaveType,
        reason: applyLeaveReason.trim()
      });
      toast.success(`${applyLeaveType} request submitted successfully!`);
      setIsApplyLeaveOpen(false);
      // Refresh attendance and my requests
      if (user?.email) {
        const { data } = await api.get(`/attendance/history/${user.email}`, {
          params: { month: trackMonth, year: trackYear }
        });
        setAttendanceData(data.data || []);
      }
      fetchMyLeaveRequests();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to submit leave request.';
      toast.error(msg);
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // Admin Review Handler (Approve / Reject)
  const handleReviewRequest = async (requestId, statusDecision, rejectionNote = '') => {
    setIsReviewingRequest(true);
    try {
      await api.patch(`/leave/${requestId}/review`, {
        status: statusDecision,
        rejectionReason: rejectionNote
      });
      toast.success(`Request ${statusDecision.toLowerCase()} successfully!`);
      setIsRejectModalOpen(false);
      setSelectedRequestToReject(null);
      setAdminRejectionReason('');
      fetchLeaveRequests();
      // If admin has tracking modal open for an employee, refresh it too
      if (isTrackOpen && activeRecord?.email) {
        const { data } = await api.get(`/attendance/history/${activeRecord.email}`, {
          params: { month: trackMonth, year: trackYear }
        });
        setAttendanceData(data.data || []);
      }
    } catch (error) {
      const msg = error.response?.data?.message || `Failed to ${statusDecision.toLowerCase()} request.`;
      toast.error(msg);
    } finally {
      setIsReviewingRequest(false);
    }
  };

  const handleOpenRejectModal = (request) => {
    setSelectedRequestToReject(request);
    setAdminRejectionReason('');
    setIsRejectModalOpen(true);
  };
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        {/* Top Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">About</h1>
            <p className="text-xs text-slate-500">Your employee profile and attendance tracking history</p>
          </div>
        </div>

        {/* Employee Profile Information Card */}
        {loadingProfile ? (
          <div className="py-12 bg-white rounded-2xl border border-slate-200 flex items-center justify-center">
            <Spinner />
          </div>
        ) : myEmployee ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Employee Profile</span>
                <h2 className="text-base font-bold text-slate-900">Personal & Professional Information</h2>
              </div>
              <span className="font-extrabold text-brand-800 text-sm bg-brand-50 border border-brand-100 px-3 py-1.5 rounded-xl">
                {myEmployee.employeeCode}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide block">Full Name</span>
                  <span className="font-bold text-slate-900 text-sm">{myEmployee.employeeName}</span>
                </div>
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide block">Domain Vertical</span>
                  <span className="font-semibold text-slate-800">{myEmployee.domain || '—'}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide block">Date of Birth</span>
                  <span className="font-semibold text-slate-800">{myEmployee.dob ? formatDateDDMMYYYY(myEmployee.dob) : '—'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide block">Blood Group</span>
                  <span className="font-semibold text-slate-800">{myEmployee.bloodGroup || '—'}</span>
                </div>
                <div className="pt-1 border-t border-slate-200/60 col-span-2 grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide block">Aadhaar Card Number</span>
                    <span className="font-mono font-semibold text-slate-800">{myEmployee.aadhaarNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide block">PAN Card Number</span>
                    <span className="font-mono font-semibold text-slate-800 uppercase">{myEmployee.panNumber || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide block">Contact</span>
                    <span className="font-semibold text-slate-800">{normalizeContactNumber(myEmployee.contactNumber) || '—'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide block">Email</span>
                    <span className="font-semibold text-slate-800 break-all text-[11px]" title={myEmployee.email}>{myEmployee.email || '—'}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide block">Home Address</span>
                  <span className="text-slate-600 text-xs">{myEmployee.homeAddress || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-500 shadow-sm">
            <p className="text-sm font-semibold">No Employee Profile Linked</p>
            <p className="text-xs text-slate-400 mt-1">
              There is no employee profile registered for <span className="font-semibold text-slate-700">{user?.email}</span>. Please contact an administrator.
            </p>
          </div>
        )}

        {/* Attendance History Card */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-center p-5 border-b border-slate-200 gap-3 bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Attendance History</h2>
              <p className="text-xs text-slate-500">Track your daily login, logout, total working hours, and session history</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={trackMonth}
                onChange={(e) => setTrackMonth(parseInt(e.target.value))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-brand-800 text-xs font-bold w-full sm:w-auto shadow-xs"
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
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-brand-800 text-xs font-bold w-full sm:w-auto shadow-xs"
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
            <div className="py-20 text-center space-y-2 border-dashed border-slate-200 bg-slate-50">
              <Clock size={32} className="text-slate-300 mx-auto" />
              <p className="text-slate-500 text-sm font-semibold">No attendance records found.</p>
            </div>
          ) : (
            <div className="responsive-table-container w-full max-w-full overflow-x-auto">
              <table className="w-max min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#07566A] text-white text-[10px] uppercase font-extrabold tracking-wider">
                    <th className="px-5 py-3.5 whitespace-nowrap min-w-[120px]">Date</th>
                    <th className="px-5 py-3.5 whitespace-nowrap min-w-[110px]">Day</th>
                    <th className="px-5 py-3.5 whitespace-nowrap min-w-[130px]">Logged In</th>
                    <th className="px-5 py-3.5 whitespace-nowrap min-w-[130px]">Logged Out</th>
                    <th className="px-5 py-3.5 whitespace-nowrap min-w-[120px]">Total Hours</th>
                    <th className="px-5 py-3.5 whitespace-nowrap min-w-[120px]">Work Mode</th>
                    <th className="px-5 py-3.5 whitespace-nowrap min-w-[200px]">Leave / OD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-xs">
                  {attendanceData.map((record, index) => {
                    let rowClass = "transition-colors hover:bg-[#D9FFF0]/25";
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
                    } else if (['CL', 'SL', 'OD'].includes(record.status)) {
                      rowClass = "bg-blue-50/20 transition-colors hover:bg-blue-50/40";
                      statusClass = "font-bold text-blue-600";
                    }

                    return (
                      <tr key={index} className={rowClass}>
                        <td className="px-5 py-3 font-bold text-slate-800 whitespace-nowrap">{record.date}</td>
                        <td className="px-5 py-3 font-medium text-slate-600">{record.day}</td>
                        <td className="px-5 py-3 font-medium text-slate-700">
                          {record.loggedIn !== 'N/A' ? (
                            <span
                              onClick={() => handleSessionClick(record.sessions)}
                              className="cursor-pointer hover:text-brand-800 flex items-center space-x-1 group transition-colors font-semibold text-slate-800"
                              title="View Sessions"
                            >
                              <span>{record.loggedIn}</span>
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs">🔍</span>
                            </span>
                          ) : (
                            <span>{record.loggedIn}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-700">{record.loggedOut}</td>
                        <td className={`px-5 py-3 ${statusClass}`}>{record.totalHours}</td>
                        <td className="px-5 py-3 font-bold text-slate-600">{record.workMode}</td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          {record.leaveRequest ? (
                            <div className="flex flex-col gap-0.5">
                              {record.leaveRequest.status === 'Approved' && (
                                <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 size={11} />
                                  <span>{record.leaveRequest.type} — Approved</span>
                                </span>
                              )}
                              {record.leaveRequest.status === 'Pending' && (
                                <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock size={11} />
                                  <span>{record.leaveRequest.type} — Pending</span>
                                </span>
                              )}
                              {record.leaveRequest.status === 'Rejected' && (
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200">
                                    <XCircle size={11} />
                                    <span>{record.leaveRequest.type} — Rejected</span>
                                  </span>
                                  {record.isEligibleForLeave && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenApplyModal(record.rawDate, record.date)}
                                      className="text-[10px] text-brand-800 hover:underline font-bold"
                                    >
                                      Re-apply
                                    </button>
                                  )}
                                </div>
                              )}
                              {record.leaveRequest.reason ? (
                                <span className="text-[10px] text-slate-500 italic whitespace-normal break-words min-w-[180px]">
                                  Reason: {record.leaveRequest.reason}
                                </span>
                              ) : null}
                            </div>
                          ) : record.isEligibleForLeave ? (
                            <button
                              type="button"
                              onClick={() => handleOpenApplyModal(record.rawDate, record.date)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-[#D9FFF0] hover:bg-[#00D98B]/20 text-[#07566A] border border-[#00D98B]/40 rounded-lg text-xs font-bold transition-all shadow-xs active:scale-[0.98]"
                              title="Apply for Leave or On Duty for this date"
                            >
                              <CalendarPlus size={12} className="text-[#00B96B]" />
                              <span>Apply Leave / OD</span>
                            </button>
                          ) : (
                            <span className="text-slate-300 font-medium">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* My Leave / OD Requests History Card */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-800">My Leave / OD Requests</h2>
              <p className="text-xs text-slate-500">History and approval statuses of your submitted requests</p>
            </div>
            <button
              type="button"
              onClick={fetchMyLeaveRequests}
              className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center space-x-1"
              title="Refresh requests"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
          </div>

          {loadingMyRequests ? (
            <div className="py-12 flex items-center justify-center">
              <Spinner />
            </div>
          ) : myLeaveRequests.length === 0 ? (
            <div className="py-10 text-center space-y-1 bg-slate-50">
              <p className="text-slate-500 text-xs font-medium">You have not submitted any Leave or OD requests yet.</p>
              <p className="text-[10px] text-slate-400">Click "Apply Leave / OD" on an upcoming date in the table above to request time off.</p>
            </div>
          ) : (
            <div className="responsive-table-container w-full max-w-full overflow-x-auto">
              <table className="w-max min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#07566A] text-white text-[10px] uppercase font-extrabold tracking-wider">
                    <th className="px-5 py-3 whitespace-nowrap min-w-[130px]">Requested Date</th>
                    <th className="px-5 py-3 whitespace-nowrap min-w-[150px]">Request Type</th>
                    <th className="px-5 py-3 whitespace-nowrap min-w-[200px]">Reason</th>
                    <th className="px-5 py-3 whitespace-nowrap min-w-[160px]">Submitted On</th>
                    <th className="px-5 py-3 whitespace-nowrap min-w-[140px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-xs">
                  {myLeaveRequests.map((req) => (
                    <tr key={req._id} className="transition-colors hover:bg-[#D9FFF0]/25">
                      <td className="px-5 py-3 font-bold text-slate-800 whitespace-nowrap min-w-[130px]">
                        {formatDateDDMMYYYY(req.requestDate)}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap min-w-[150px]">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-extrabold border ${
                          req.requestType === 'CL'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : req.requestType === 'SL'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {req.requestType === 'CL' ? 'Casual Leave (CL)' : req.requestType === 'SL' ? 'Sick Leave (SL)' : 'On Duty (OD)'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600 min-w-[200px] whitespace-normal break-words">
                        {req.reason || <span className="text-slate-400 italic">No reason specified</span>}
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-[11px] whitespace-nowrap">
                        {req.createdAt ? new Date(req.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        }) : '—'}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {req.status === 'Pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock size={11} />
                            <span>Pending</span>
                          </span>
                        )}
                        {req.status === 'Approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={11} />
                            <span>Approved</span>
                          </span>
                        )}
                        {req.status === 'Rejected' && (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 w-fit px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200">
                              <XCircle size={11} />
                              <span>Rejected</span>
                            </span>
                            {req.rejectionReason && (
                              <span className="text-[10px] text-red-600 italic">Note: {req.rejectionReason}</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* APPLY LEAVE / OD MODAL */}
        <Modal
          isOpen={isApplyLeaveOpen}
          onClose={() => setIsApplyLeaveOpen(false)}
          title="Apply Leave / On Duty"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSubmitLeaveRequest} className="space-y-4 text-slate-800">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Selected Date</label>
              <input
                type="text"
                disabled
                value={applyLeaveDisplayDate}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold"
              />
              <p className="text-[10px] text-slate-400 mt-1">Date cannot be changed to an ineligible date.</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Request Type *</label>
              <select
                required
                value={applyLeaveType}
                onChange={(e) => setApplyLeaveType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs font-semibold"
              >
                <option value="CL">CL — Casual Leave</option>
                <option value="SL">SL — Sick Leave</option>
                <option value="OD">OD — On Duty</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Reason (Optional)</label>
              <textarea
                rows={3}
                value={applyLeaveReason}
                onChange={(e) => setApplyLeaveReason(e.target.value)}
                placeholder="e.g. Personal work, Family emergency, Fever, Client visit..."
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsApplyLeaveOpen(false)}
                disabled={isSubmittingLeave}
                className="w-full sm:flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingLeave}
                className="w-full sm:flex-1 py-2.5 bg-gradient-to-r from-[#00D98B] to-[#00B96B] hover:from-[#00E99A] hover:to-[#00D98B] disabled:opacity-50 text-[#07566A] font-extrabold text-xs rounded-xl shadow-[0_4px_14px_rgba(0,217,139,0.3)] transition-all flex items-center justify-center space-x-1.5 active:scale-[0.98]"
              >
                {isSubmittingLeave ? (
                  <>
                    <Spinner size="small" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Request</span>
                )}
              </button>
            </div>
          </form>
        </Modal>

        {/* LOGIN SESSION HISTORY MODAL */}
        <Modal
          isOpen={isSessionHistoryOpen}
          onClose={() => setIsSessionHistoryOpen(false)}
          title="Login Session History"
          maxWidth="max-w-2xl"
        >
          <div className="responsive-table-container w-full max-w-full overflow-x-auto border border-slate-200 rounded-xl mt-4">
            <table className="w-max min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#07566A] text-white text-[10px] uppercase font-extrabold tracking-wider">
                  <th className="px-4 py-3 whitespace-nowrap min-w-[90px]">Session</th>
                  <th className="px-4 py-3 whitespace-nowrap min-w-[130px]">Login Time</th>
                  <th className="px-4 py-3 whitespace-nowrap min-w-[130px]">Session End</th>
                  <th className="px-4 py-3 whitespace-nowrap min-w-[110px]">Duration</th>
                  <th className="px-4 py-3 whitespace-nowrap min-w-[110px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-xs">
                {selectedSessions.map((session, i) => (
                  <tr key={i} className="transition-colors hover:bg-[#D9FFF0]/25">
                    <td className="px-4 py-2.5 font-bold text-slate-800 whitespace-nowrap min-w-[90px]">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-600 whitespace-nowrap min-w-[130px]">{session.loginTime}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-600 whitespace-nowrap min-w-[130px]">{session.endTime}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-600 whitespace-nowrap min-w-[110px]">{session.duration || 'N/A'}</td>
                    <td className="px-4 py-2.5 font-bold text-brand-700 whitespace-nowrap min-w-[110px]">{session.type}</td>
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
  }

  // Admin Employees Info View
  return (
    <div className="space-y-6">
      {/* Top action section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Employees Info</h1>
          <p className="text-xs text-slate-500">
            {adminTab === 'employees'
              ? 'Manage employee records, search, and export data'
              : 'Review and manage employee leave and on-duty requests'}
          </p>
        </div>
        {adminTab === 'employees' ? (
          <button
            onClick={handleAddClick}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-[#00D98B] to-[#00B96B] hover:from-[#00E99A] hover:to-[#00D98B] text-[#07566A] font-extrabold text-xs rounded-xl shadow-[0_4px_14px_rgba(0,217,139,0.3)] hover:shadow-[0_6px_18px_rgba(0,217,139,0.4)] transition-all uppercase tracking-wider active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Add Employee</span>
          </button>
        ) : (
          <button
            onClick={fetchLeaveRequests}
            disabled={loadingRequests}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw size={14} className={loadingRequests ? 'animate-spin text-brand-800' : ''} />
            <span>Refresh Requests</span>
          </button>
        )}
      </div>

      {/* Admin Tab Switcher */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setAdminTab('employees')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            adminTab === 'employees'
              ? 'bg-brand-800 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users size={15} />
          <span>Employees Directory</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            adminTab === 'employees' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {totalRecords}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('requests')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            adminTab === 'requests'
              ? 'bg-brand-800 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar size={15} />
          <span>Leave / OD Requests</span>
          {leaveStats.pending > 0 ? (
            <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-extrabold animate-pulse">
              {leaveStats.pending} Pending
            </span>
          ) : (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              adminTab === 'requests' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {leaveStats.total || 0}
            </span>
          )}
        </button>
      </div>

      {adminTab === 'employees' && (
        <>
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
                placeholder="Search by Code, Name, Email, Domain, Contact, Aadhaar, or PAN..."
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
          <div className="responsive-table-container w-full max-w-full overflow-x-auto">
            <table className="w-max min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#07566A] text-white text-[10px] uppercase font-extrabold tracking-wider">
                  <th onClick={() => handleSort('employeeCode')} className="px-6 py-4 cursor-pointer hover:text-[#00D98B] whitespace-nowrap min-w-[130px]">
                    <div className="flex items-center space-x-1">
                      <span>Employee Code</span>
                      {sortBy === 'employeeCode' && (sortOrder === 'asc' ? <ChevronUp size={12} className="text-[#00D98B]" /> : <ChevronDown size={12} className="text-[#00D98B]" />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('employeeName')} className="px-6 py-4 cursor-pointer hover:text-[#00D98B] whitespace-nowrap min-w-[160px]">
                    <div className="flex items-center space-x-1">
                      <span>Name</span>
                      {sortBy === 'employeeName' && (sortOrder === 'asc' ? <ChevronUp size={12} className="text-[#00D98B]" /> : <ChevronDown size={12} className="text-[#00D98B]" />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('domain')} className="px-6 py-4 cursor-pointer hover:text-[#00D98B] whitespace-nowrap min-w-[140px]">
                    <div className="flex items-center space-x-1">
                      <span>Domain Vertical</span>
                      {sortBy === 'domain' && (sortOrder === 'asc' ? <ChevronUp size={12} className="text-[#00D98B]" /> : <ChevronDown size={12} className="text-[#00D98B]" />)}
                    </div>
                  </th>
                  <th className="px-6 py-4 whitespace-nowrap min-w-[180px]">Contact / Email</th>
                  <th onClick={() => handleSort('dob')} className="px-6 py-4 cursor-pointer hover:text-[#00D98B] whitespace-nowrap min-w-[120px]">
                    <div className="flex items-center space-x-1">
                      <span>Date of Birth</span>
                      {sortBy === 'dob' && (sortOrder === 'asc' ? <ChevronUp size={12} className="text-[#00D98B]" /> : <ChevronDown size={12} className="text-[#00D98B]" />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('bloodGroup')} className="px-6 py-4 cursor-pointer hover:text-[#00D98B] whitespace-nowrap min-w-[110px]">
                    <div className="flex items-center space-x-1">
                      <span>Blood Group</span>
                      {sortBy === 'bloodGroup' && (sortOrder === 'asc' ? <ChevronUp size={12} className="text-[#00D98B]" /> : <ChevronDown size={12} className="text-[#00D98B]" />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('aadhaarNumber')} className="px-6 py-4 cursor-pointer hover:text-[#00D98B] whitespace-nowrap min-w-[160px]">
                    <div className="flex items-center space-x-1">
                      <span>Aadhaar Card Number</span>
                      {sortBy === 'aadhaarNumber' && (sortOrder === 'asc' ? <ChevronUp size={12} className="text-[#00D98B]" /> : <ChevronDown size={12} className="text-[#00D98B]" />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('panNumber')} className="px-6 py-4 cursor-pointer hover:text-[#00D98B] whitespace-nowrap min-w-[150px]">
                    <div className="flex items-center space-x-1">
                      <span>PAN Card Number</span>
                      {sortBy === 'panNumber' && (sortOrder === 'asc' ? <ChevronUp size={12} className="text-[#00D98B]" /> : <ChevronDown size={12} className="text-[#00D98B]" />)}
                    </div>
                  </th>
                  <th className="px-6 py-4 whitespace-nowrap min-w-[220px]">Home Address</th>
                  <th onClick={() => handleSort('createdAt')} className="px-6 py-4 cursor-pointer hover:text-[#00D98B] whitespace-nowrap min-w-[140px]">
                    <div className="flex items-center space-x-1">
                      <span>Created Date</span>
                      {sortBy === 'createdAt' && (sortOrder === 'asc' ? <ChevronUp size={12} className="text-[#00D98B]" /> : <ChevronDown size={12} className="text-[#00D98B]" />)}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right whitespace-nowrap min-w-[150px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-xs">
                {records.map((r) => (
                  <tr key={r._id} className="transition-colors hover:bg-[#D9FFF0]/25">
                    <td className="px-6 py-4 font-extrabold text-brand-800 whitespace-nowrap min-w-[130px]">{r.employeeCode}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap min-w-[160px]">{r.employeeName}</td>
                    <td className="px-6 py-4 text-slate-700 font-medium whitespace-nowrap min-w-[140px]">{r.domain || '—'}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap min-w-[180px]">
                      <div className="font-semibold text-slate-800">{normalizeContactNumber(r.contactNumber) || '—'}</div>
                      {r.email && (
                        <div className="text-[10px] text-slate-500 whitespace-nowrap font-normal">
                          {r.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-700 whitespace-nowrap font-medium min-w-[120px]">
                      {r.dob ? formatDateDDMMYYYY(r.dob) : '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-700 whitespace-nowrap font-semibold min-w-[110px]">
                      {r.bloodGroup || '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-800 whitespace-nowrap font-mono font-medium min-w-[160px]">
                      {r.aadhaarNumber || '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-800 whitespace-nowrap font-mono font-semibold uppercase min-w-[150px]">
                      {r.panNumber || '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-600 min-w-[220px]">
                      <div className="text-slate-600 min-w-[220px] whitespace-normal break-words">
                        {r.homeAddress || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap min-w-[140px]">
                      <div className="text-[10px] text-slate-700 font-medium">{formatDateDDMMYYYY(r.createdAt)}</div>
                      <div className="text-[9px] text-slate-400">By {r.createdBy || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap min-w-[150px]">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* View Details Action */}
                        <button
                          onClick={() => handleViewClick(r)}
                          className="p-1.5 bg-slate-50 border border-slate-200 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all text-slate-500"
                          title="View Employee Details"
                        >
                          <Eye size={13} />
                        </button>
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
        </>
      )}

      {adminTab === 'requests' && (
        <div className="space-y-6">
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
              <div className="p-3 rounded-xl bg-slate-100 text-slate-700">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Requests</p>
                <p className="text-xl font-black text-slate-900">{leaveStats.total || 0}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-sm flex items-center space-x-3.5 bg-gradient-to-br from-white to-amber-50/30">
              <div className="p-3 rounded-xl bg-amber-100 text-amber-700">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pending</p>
                <p className="text-xl font-black text-amber-700">{leaveStats.pending || 0}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-sm flex items-center space-x-3.5 bg-gradient-to-br from-white to-emerald-50/30">
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Approved</p>
                <p className="text-xl font-black text-emerald-700">{leaveStats.approved || 0}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-red-200/80 shadow-sm flex items-center space-x-3.5 bg-gradient-to-br from-white to-red-50/30">
              <div className="p-3 rounded-xl bg-red-100 text-red-700">
                <XCircle size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Rejected</p>
                <p className="text-xl font-black text-red-700">{leaveStats.rejected || 0}</p>
              </div>
            </div>
          </div>

          {/* Controls: Status Filters, Search, Refresh */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Status pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
              {['All', 'Pending', 'Approved', 'Rejected'].map((statusKey) => {
                const count = statusKey === 'All'
                  ? leaveStats.total
                  : statusKey === 'Pending'
                  ? leaveStats.pending
                  : statusKey === 'Approved'
                  ? leaveStats.approved
                  : leaveStats.rejected;
                const isActive = requestStatusFilter === statusKey;
                return (
                  <button
                    key={statusKey}
                    type="button"
                    onClick={() => setRequestStatusFilter(statusKey)}
                    className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-brand-800 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{statusKey}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-700'
                    }`}>
                      {count || 0}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search and Refresh */}
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <input
                  type="text"
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  placeholder="Search by code, name, email, reason..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
                />
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                {requestSearch && (
                  <button
                    type="button"
                    onClick={() => setRequestSearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={fetchLeaveRequests}
                disabled={loadingRequests}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all shadow-xs disabled:opacity-50"
                title="Refresh requests"
              >
                <RefreshCw size={15} className={loadingRequests ? 'animate-spin text-brand-800' : ''} />
              </button>
            </div>
          </div>

          {/* Leave / OD Requests Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingRequests ? (
              <div className="py-20 flex items-center justify-center">
                <Spinner />
              </div>
            ) : leaveRequests.length === 0 ? (
              <div className="py-20 text-center space-y-2 border-dashed border-slate-200">
                <Calendar size={36} className="text-slate-300 mx-auto" />
                <p className="text-slate-700 font-bold text-sm">No leave / OD requests found</p>
                <p className="text-slate-400 text-xs">
                  {requestStatusFilter !== 'All'
                    ? `No ${requestStatusFilter.toLowerCase()} requests match your current filters.`
                    : 'Employees have not submitted any leave or on-duty requests yet.'}
                </p>
              </div>
            ) : (
              <div className="responsive-table-container w-full max-w-full overflow-x-auto">
                <table className="w-max min-w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#07566A] text-white text-[10px] uppercase font-extrabold tracking-wider">
                      <th className="px-5 py-3 whitespace-nowrap min-w-[170px]">Employee</th>
                      <th className="px-5 py-3 whitespace-nowrap min-w-[130px]">Requested Date</th>
                      <th className="px-5 py-3 whitespace-nowrap min-w-[150px]">Type</th>
                      <th className="px-5 py-3 min-w-[220px] whitespace-nowrap">Reason</th>
                      <th className="px-5 py-3 whitespace-nowrap min-w-[150px]">Submitted On</th>
                      <th className="px-5 py-3 whitespace-nowrap min-w-[150px]">Status</th>
                      <th className="px-5 py-3 text-right whitespace-nowrap min-w-[180px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-xs">
                    {leaveRequests.map((req) => {
                      const isPending = req.status === 'Pending';
                      const isApproved = req.status === 'Approved';
                      const isRejected = req.status === 'Rejected';

                      return (
                        <tr key={req._id} className="transition-colors hover:bg-[#D9FFF0]/25">
                          {/* Employee info */}
                          <td className="px-5 py-3.5 whitespace-nowrap min-w-[170px]">
                            <div className="font-extrabold text-slate-900">{req.employeeName}</div>
                            <div className="text-[11px] font-mono text-brand-800 font-bold">{req.employeeCode}</div>
                            <div className="text-[11px] text-slate-400">{req.employeeEmail}</div>
                          </td>

                          {/* Requested Date */}
                          <td className="px-5 py-3.5 whitespace-nowrap min-w-[130px]">
                            <div className="font-bold text-slate-800">{formatDateDDMMYYYY(req.requestDate)}</div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(req.requestDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
                            </div>
                          </td>

                          {/* Type */}
                          <td className="px-5 py-3.5 whitespace-nowrap min-w-[150px]">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border ${
                              req.requestType === 'CL'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : req.requestType === 'SL'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}>
                              {req.requestType === 'CL' ? 'CL (Casual Leave)' : req.requestType === 'SL' ? 'SL (Sick Leave)' : 'OD (On Duty)'}
                            </span>
                          </td>

                          {/* Reason */}
                          <td className="px-5 py-3.5 text-slate-700 min-w-[220px]">
                            {req.reason ? (
                              <span className="whitespace-normal break-words block">{req.reason}</span>
                            ) : (
                              <span className="text-slate-400 italic">No reason provided</span>
                            )}
                          </td>

                          {/* Submitted On */}
                          <td className="px-5 py-3.5 text-slate-500 text-[11px] whitespace-nowrap min-w-[150px]">
                            {req.createdAt ? new Date(req.createdAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            }) : '—'}
                          </td>

                          {/* Status */}
                          <td className="px-5 py-3.5 whitespace-nowrap min-w-[150px]">
                            {isPending && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock size={12} />
                                <span>Pending Approval</span>
                              </span>
                            )}
                            {isApproved && (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1.5 w-fit px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 size={12} />
                                  <span>Approved</span>
                                </span>
                                {req.reviewedBy && (
                                  <span className="text-[9px] text-slate-400">By {req.reviewedBy}</span>
                                )}
                              </div>
                            )}
                            {isRejected && (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1.5 w-fit px-3 py-1 rounded-full text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200">
                                  <XCircle size={12} />
                                  <span>Rejected</span>
                                </span>
                                {req.rejectionReason && (
                                  <span className="text-[10px] text-red-600 italic whitespace-normal break-words block">Reason: {req.rejectionReason}</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            {isPending ? (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  type="button"
                                  disabled={isReviewingRequest}
                                  onClick={() => handleReviewRequest(req._id, 'Approved')}
                                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                                  title="Approve this request"
                                >
                                  <Check size={13} />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isReviewingRequest}
                                  onClick={() => handleOpenRejectModal(req)}
                                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                                  title="Reject this request"
                                >
                                  <X size={13} />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs font-medium">Decided</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Aadhaar Card Number</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={12}
                value={formData.aadhaarNumber}
                onKeyDown={(e) => {
                  if (
                    ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key) ||
                    ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x', 'z', 'y'].includes(e.key.toLowerCase()))
                  ) {
                    return;
                  }
                  if (!/^\d$/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const sanitized = sanitizeAadhaarInput(e.target.value);
                  setFormData({ ...formData, aadhaarNumber: sanitized });
                  if (formErrors.aadhaarNumber) {
                    setFormErrors({ ...formErrors, aadhaarNumber: '' });
                  }
                }}
                placeholder="12-digit number (e.g. 123456789012)"
                className={`w-full px-3.5 py-2.5 bg-slate-50/70 border ${formErrors.aadhaarNumber ? 'border-red-500' : 'border-slate-200'} rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs font-mono`}
              />
              {formErrors.aadhaarNumber && (
                <p className="text-[10px] text-red-600 mt-1">{formErrors.aadhaarNumber}</p>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">PAN Card Number</label>
              <input
                type="text"
                maxLength={10}
                value={formData.panNumber}
                onChange={(e) => {
                  const sanitized = sanitizePanInput(e.target.value);
                  setFormData({ ...formData, panNumber: sanitized });
                  if (formErrors.panNumber) {
                    setFormErrors({ ...formErrors, panNumber: '' });
                  }
                }}
                placeholder="e.g. ABCDE1234F"
                className={`w-full px-3.5 py-2.5 bg-slate-50/70 border ${formErrors.panNumber ? 'border-red-500' : 'border-slate-200'} rounded-xl text-slate-800 uppercase focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs font-mono`}
              />
              {formErrors.panNumber && (
                <p className="text-[10px] text-red-600 mt-1">{formErrors.panNumber}</p>
              )}
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
              className="w-full sm:flex-1 py-2.5 bg-gradient-to-r from-[#00D98B] to-[#00B96B] hover:from-[#00E99A] hover:to-[#00D98B] text-[#07566A] font-extrabold text-xs rounded-xl shadow-[0_4px_14px_rgba(0,217,139,0.3)] transition-all active:scale-[0.98]"
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
        maxWidth="max-w-5xl"
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
          <div className="responsive-table-container w-full max-w-full overflow-x-auto border border-slate-200 rounded-xl max-h-[60vh] overflow-y-auto">
            <table className="w-max min-w-full text-left border-collapse relative">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#07566A] text-white text-[10px] uppercase font-extrabold tracking-wider">
                  <th className="px-4 py-3 whitespace-nowrap min-w-[120px]">Date</th>
                  <th className="px-4 py-3 whitespace-nowrap min-w-[110px]">Day</th>
                  <th className="px-4 py-3 whitespace-nowrap min-w-[130px]">Logged In</th>
                  <th className="px-4 py-3 whitespace-nowrap min-w-[130px]">Logged Out</th>
                  <th className="px-4 py-3 whitespace-nowrap min-w-[120px]">Total Hours</th>
                  <th className="px-4 py-3 whitespace-nowrap min-w-[120px]">Work Mode</th>
                  <th className="px-4 py-3 whitespace-nowrap min-w-[200px]">Leave / OD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-xs">
                {attendanceData.map((record, index) => {
                  let rowClass = "transition-colors hover:bg-[#D9FFF0]/25";
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
                  } else if (['CL', 'SL', 'OD'].includes(record.status)) {
                    rowClass = "bg-blue-50/20 transition-colors hover:bg-blue-50/40";
                    statusClass = "font-bold text-blue-600";
                  }

                  return (
                    <tr key={index} className={rowClass}>
                      <td className="px-4 py-2.5 font-bold text-slate-800 whitespace-nowrap min-w-[120px]">{record.date}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-600 whitespace-nowrap min-w-[110px]">{record.day}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-700 whitespace-nowrap min-w-[130px]">
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
                      <td className="px-4 py-2.5 font-medium text-slate-700 whitespace-nowrap min-w-[130px]">{record.loggedOut}</td>
                      <td className={`px-4 py-2.5 whitespace-nowrap min-w-[120px] ${statusClass}`}>{record.totalHours}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-600 whitespace-nowrap min-w-[120px]">{record.workMode}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap min-w-[200px]">
                        {record.leaveRequest ? (
                          <div className="flex flex-col gap-0.5">
                            {record.leaveRequest.status === 'Approved' && (
                              <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={11} />
                                <span>{record.leaveRequest.type} — Approved</span>
                              </span>
                            )}
                            {record.leaveRequest.status === 'Pending' && (
                              <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock size={11} />
                                <span>{record.leaveRequest.type} — Pending</span>
                              </span>
                            )}
                            {record.leaveRequest.status === 'Rejected' && (
                              <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200">
                                <XCircle size={11} />
                                <span>{record.leaveRequest.type} — Rejected</span>
                              </span>
                            )}
                            {record.leaveRequest.reason ? (
                              <span className="text-[10px] text-slate-500 italic whitespace-normal break-words min-w-[180px]">
                                Reason: {record.leaveRequest.reason}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-medium">—</span>
                        )}
                      </td>
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
        <div className="responsive-table-container w-full max-w-full overflow-x-auto border border-slate-200 rounded-xl mt-4">
          <table className="w-max min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#07566A] text-white text-[10px] uppercase font-extrabold tracking-wider">
                <th className="px-4 py-3 whitespace-nowrap min-w-[90px]">Session</th>
                <th className="px-4 py-3 whitespace-nowrap min-w-[130px]">Login Time</th>
                <th className="px-4 py-3 whitespace-nowrap min-w-[130px]">Session End</th>
                <th className="px-4 py-3 whitespace-nowrap min-w-[110px]">Duration</th>
                <th className="px-4 py-3 whitespace-nowrap min-w-[110px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-xs">
              {selectedSessions.map((session, i) => (
                <tr key={i} className="transition-colors hover:bg-[#D9FFF0]/25">
                  <td className="px-4 py-2.5 font-bold text-slate-800 whitespace-nowrap min-w-[90px]">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-600 whitespace-nowrap min-w-[130px]">{session.loginTime}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-600 whitespace-nowrap min-w-[130px]">{session.endTime}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-600 whitespace-nowrap min-w-[110px]">{session.duration || 'N/A'}</td>
                  <td className="px-4 py-2.5 font-bold text-brand-700 whitespace-nowrap min-w-[110px]">{session.type}</td>
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

      {/* VIEW EMPLOYEE DETAILS MODAL */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title={`Employee: ${activeRecord?.employeeCode || ''}`}
        maxWidth="max-w-lg"
      >
        {activeRecord && (
          <div className="space-y-4 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div>
                <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide block">Employee Code</span>
                <span className="font-extrabold text-brand-800 text-sm">{activeRecord.employeeCode}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide block">Full Name</span>
                  <span className="font-bold text-slate-900">{activeRecord.employeeName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide block">Domain Vertical</span>
                  <span className="font-semibold text-slate-800">{activeRecord.domain || '—'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide block">Date of Birth</span>
                <span className="font-semibold text-slate-800">{activeRecord.dob ? formatDateDDMMYYYY(activeRecord.dob) : '—'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide block">Blood Group</span>
                <span className="font-semibold text-slate-800">{activeRecord.bloodGroup || '—'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide block">Aadhaar Card Number</span>
                <span className="font-mono font-semibold text-slate-800">{activeRecord.aadhaarNumber || '—'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide block">PAN Card Number</span>
                <span className="font-mono font-semibold text-slate-800 uppercase">{activeRecord.panNumber || '—'}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide block">Contact Number</span>
                  <span className="font-semibold text-slate-800">{normalizeContactNumber(activeRecord.contactNumber) || '—'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide block">Email Address</span>
                  <span className="font-semibold text-slate-800 break-all">{activeRecord.email || '—'}</span>
                </div>
              </div>
              <div className="pt-1 border-t border-slate-200/60">
                <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide block">Home Address</span>
                <span className="text-slate-600">{activeRecord.homeAddress || '—'}</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 flex flex-col sm:flex-row justify-between gap-1">
              <span>Created: {formatDateDDMMYYYY(activeRecord.createdAt)} by {activeRecord.createdBy || '—'}</span>
              <span>Updated by: {activeRecord.updatedBy || '—'}</span>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ADMIN REJECT MODAL */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
          if (!isReviewingRequest) {
            setIsRejectModalOpen(false);
            setSelectedRequestToReject(null);
          }
        }}
        title="Reject Leave / OD Request"
        maxWidth="max-w-md"
      >
        {selectedRequestToReject && (
          <div className="space-y-4 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Employee</span>
                <span className="font-extrabold text-slate-800">{selectedRequestToReject.employeeName} ({selectedRequestToReject.employeeCode})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Requested Date</span>
                <span className="font-bold text-slate-800">{formatDateDDMMYYYY(selectedRequestToReject.requestDate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Request Type</span>
                <span className="font-bold text-brand-800">{selectedRequestToReject.requestType}</span>
              </div>
              {selectedRequestToReject.reason && (
                <div className="pt-1.5 border-t border-slate-200/60">
                  <span className="text-slate-500 font-bold uppercase text-[10px] block">Reason</span>
                  <p className="text-slate-600 mt-0.5">{selectedRequestToReject.reason}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Rejection Note (Optional)
              </label>
              <textarea
                rows={3}
                value={adminRejectionReason}
                onChange={(e) => setAdminRejectionReason(e.target.value)}
                placeholder="Reason for rejecting this request (visible to the employee)..."
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-xs"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isReviewingRequest}
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setSelectedRequestToReject(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReviewingRequest}
                onClick={() => handleReviewRequest(selectedRequestToReject._id, 'Rejected', adminRejectionReason)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
              >
                {isReviewingRequest && <Spinner size="sm" />}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default Employees;
