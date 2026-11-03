import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  Search,
  RotateCw,
  Clock,
  User,
  Calendar,
  Building2,
  MapPin,
  Mail,
  Phone,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  List,
  GitCommit,
  AlertCircle,
  FileText,
  FileCode,
  CheckSquare,
  MessageSquare,
  Download,
  Eye,
  Upload,
  FileQuestion,
  Edit2,
  Check,
  AlertTriangle,
  X
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import { recruitmentFilterOptions, getStatusLabel } from '../utils/statusMaster';
import {
  CR_STATUS_OPTIONS,
  CR_STATUS_MAP,
  toCrStatusCode,
  getCrStatusLabel,
  getCrStatusKey,
} from '../utils/crStatusMaster';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY, formatDeadlineDate } from '../utils/dateFormatter';
import {
  viewAnalyticsDocument,
  downloadAnalyticsDocument,
  getAnalyticsDocumentUrl,
} from '../utils/analyticsDocument';

const CONDITIONS_LIST = CR_STATUS_OPTIONS;

const MAX_FILE_SIZE = 100 * 1024; // 100 KB

const toDateInputValue = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const SourcingAuditTrails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  // Active record information (from location state if available, or fetched from API)
  const [record, setRecord] = useState(location.state?.record || null);
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = newest first, 'asc' = oldest first
  const [viewMode, setViewMode] = useState('table'); // 'table' (default) or 'timeline'
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Action Section Modals State
  const [isRequestLetterOpen, setIsRequestLetterOpen] = useState(false);
  const [isUrlLetterOpen, setIsUrlLetterOpen] = useState(false);
  const [isCompanyProfileOpen, setIsCompanyProfileOpen] = useState(false);
  const [isEmailPackOpen, setIsEmailPackOpen] = useState(false);
  const [isConditionsOpen, setIsConditionsOpen] = useState(false);
  const [isRemarksOpen, setIsRemarksOpen] = useState(false);

  // Action Section Upload & Form States
  const [requestLetterFile, setRequestLetterFile] = useState(null);
  const [requestLetterError, setRequestLetterError] = useState('');
  const [uploadingRequestLetter, setUploadingRequestLetter] = useState(false);

  const [urlLetterFile, setUrlLetterFile] = useState(null);
  const [urlLetterError, setUrlLetterError] = useState('');
  const [uploadingUrlLetter, setUploadingUrlLetter] = useState(false);

  const [companyProfileFile, setCompanyProfileFile] = useState(null);
  const [companyProfileError, setCompanyProfileError] = useState('');
  const [uploadingCompanyProfile, setUploadingCompanyProfile] = useState(false);

  // Single active condition selection state (mutually exclusive)
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [onHoldDeadlineInput, setOnHoldDeadlineInput] = useState('');
  const [onHoldDeadlineError, setOnHoldDeadlineError] = useState('');
  const [savingConditions, setSavingConditions] = useState(false);

  // Remarks state: read-only by default when existing remarks present
  const [remarks, setRemarks] = useState('');
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [savingRemarks, setSavingRemarks] = useState(false);

  // Fetch record and history
  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const historyPromise = api.get(`/analytics/history/${id}`);
      const recordPromise = api.get(`/analytics/${id}`).catch(() => null);

      const [historyRes, recordRes] = await Promise.all([historyPromise, recordPromise]);

      setHistoryList(historyRes.data || []);

      if (recordRes?.data) {
        setRecord(recordRes.data);
      }

      if (isManualRefresh) {
        toast.success('Audit trails refreshed');
      }
    } catch (err) {
      console.error('Error fetching sourcing audit trails:', err);
      const errMsg = err.response?.data?.message || 'Failed to load sourcing audit trails.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    } else {
      setError('Invalid record ID.');
      setLoading(false);
    }
  }, [id]);

  // Listen for audit trail updates from sidebar Update Status
  useEffect(() => {
    const handleAuditTrailUpdate = () => {
      if (id) {
        fetchData();
      }
    };
    window.addEventListener('audit-trail-updated', handleAuditTrailUpdate);
    return () => {
      window.removeEventListener('audit-trail-updated', handleAuditTrailUpdate);
    };
  }, [id]);

  // Reset page when search or status filter changes
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortOrder]);

  // Determine if active On-Hold warning should be displayed
  const isOnHoldWarningVisible = useMemo(() => {
    if (!record) return false;
    // Check if CR Status or activeCondition is On-Hold
    const isHoldStatus =
      record.crStatus === 'On-Hold' ||
      record.activeCondition === 'On-Hold' ||
      record.conditionsRequired?.onHold;

    if (!isHoldStatus || !record.onHoldDeadline) {
      return false;
    }

    const deadline = new Date(record.onHoldDeadline);
    if (isNaN(deadline.getTime())) {
      return false;
    }

    // Active until end of the deadline day
    const deadlineEndOfDay = new Date(deadline);
    deadlineEndOfDay.setHours(23, 59, 59, 999);
    return new Date() < deadlineEndOfDay;
  }, [record?.crStatus, record?.activeCondition, record?.onHoldDeadline, record?.conditionsRequired?.onHold]);

  // Filtered & Sorted history list
  const filteredHistory = useMemo(() => {
    let result = Array.isArray(historyList) ? [...historyList] : [];

    if (statusFilter !== '') {
      result = result.filter((item) => Number(item.status) === Number(statusFilter));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((item) => {
        const descMatch = (item.description || '').toLowerCase().includes(q);
        const userMatch = (item.updatedBy || '').toLowerCase().includes(q);
        const statusLabel = getStatusLabel('recruitment', item.status).toLowerCase();
        const statusMatch = statusLabel.includes(q);
        const dateMatch = formatDateTimeDDMMYYYY(item.updatedOn).toLowerCase().includes(q);
        return descMatch || userMatch || statusMatch || dateMatch;
      });
    }

    result.sort((a, b) => {
      const timeA = new Date(a.updatedOn).getTime() || 0;
      const timeB = new Date(b.updatedOn).getTime() || 0;
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    return result;
  }, [historyList, statusFilter, search, sortOrder]);

  // Pagination calculation
  const totalFiltered = filteredHistory.length;
  const totalPages = Math.ceil(totalFiltered / limit) || 1;
  const paginatedHistory = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredHistory.slice(start, start + limit);
  }, [filteredHistory, page, limit]);

  const hasActiveFilters = Boolean(search.trim() || statusFilter !== '');

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setSortOrder('desc');
    setPage(1);
  };

  const handleBack = () => {
    navigate('/dashboard/analytics');
  };

  // File size validation helper (max 100 KB)
  const handleFileSelect = (e, setFile, setErrorMsg) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      const err = `File size (${(file.size / 1024).toFixed(1)} KB) exceeds maximum allowed limit of 100 KB.`;
      setErrorMsg(err);
      toast.error(err);
      e.target.value = '';
      setFile(null);
      return;
    }

    setErrorMsg('');
    setFile(file);
  };

  // Upload Request Letter
  const handleUploadRequestLetter = async () => {
    if (!requestLetterFile) {
      toast.error('Please select a file to upload');
      return;
    }
    if (requestLetterFile.size > MAX_FILE_SIZE) {
      toast.error('File size must not exceed 100 KB.');
      return;
    }

    setUploadingRequestLetter(true);
    const formData = new FormData();
    formData.append('document', requestLetterFile);

    try {
      const { data } = await api.post(`/analytics/${id}/request-letter`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRecord(data);
      setRequestLetterFile(null);
      setRequestLetterError('');
      toast.success('Request Letter document uploaded successfully');
    } catch (err) {
      console.error('Request letter upload error:', err);
      toast.error(err.response?.data?.message || 'Failed to upload Request Letter');
    } finally {
      setUploadingRequestLetter(false);
    }
  };

  // Upload URL Letter
  const handleUploadUrlLetter = async () => {
    if (!urlLetterFile) {
      toast.error('Please select a file to upload');
      return;
    }
    if (urlLetterFile.size > MAX_FILE_SIZE) {
      toast.error('File size must not exceed 100 KB.');
      return;
    }

    setUploadingUrlLetter(true);
    const formData = new FormData();
    formData.append('document', urlLetterFile);

    try {
      const { data } = await api.post(`/analytics/${id}/url-letter`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRecord(data);
      setUrlLetterFile(null);
      setUrlLetterError('');
      toast.success('URL Letter document uploaded successfully');
    } catch (err) {
      console.error('URL letter upload error:', err);
      toast.error(err.response?.data?.message || 'Failed to upload URL Letter');
    } finally {
      setUploadingUrlLetter(false);
    }
  };

  // Upload Company Profile
  const handleUploadCompanyProfile = async () => {
    if (!companyProfileFile) {
      toast.error('Please select a file to upload');
      return;
    }
    if (companyProfileFile.size > MAX_FILE_SIZE) {
      toast.error('File size must not exceed 100 KB.');
      return;
    }

    setUploadingCompanyProfile(true);
    const formData = new FormData();
    formData.append('document', companyProfileFile);

    try {
      const { data } = await api.post(`/analytics/${id}/company-profile`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRecord(data);
      setCompanyProfileFile(null);
      setCompanyProfileError('');
      toast.success('Company Profile document uploaded successfully');
    } catch (err) {
      console.error('Company Profile upload error:', err);
      toast.error(err.response?.data?.message || 'Failed to upload Company Profile');
    } finally {
      setUploadingCompanyProfile(false);
    }
  };

  // Open Conditions Modal with current saved state (numeric 1-10)
  const handleOpenConditionsModal = () => {
    const code = toCrStatusCode(record?.crStatusCode || record?.crStatus || record?.activeCondition);
    setSelectedCondition(code);
    setOnHoldDeadlineInput(record?.onHoldDeadline ? toDateInputValue(record.onHoldDeadline) : '');
    setOnHoldDeadlineError('');
    setIsConditionsOpen(true);
  };

  // Toggle single condition (mutually exclusive numeric selection)
  const handleToggleCondition = (code) => {
    setSelectedCondition((prev) => (prev === code ? null : code));
    if (code !== 2) {
      setOnHoldDeadlineError('');
    }
  };

  // Save Conditions Required
  const handleSaveConditions = async () => {
    // If On-Hold (code 2) is selected, deadline date is mandatory
    if (selectedCondition === 2 && !onHoldDeadlineInput) {
      const err = 'Deadline date is mandatory when On-Hold condition is selected.';
      setOnHoldDeadlineError(err);
      toast.error(err);
      return;
    }

    setSavingConditions(true);
    try {
      const selectedItem = CR_STATUS_OPTIONS.find((c) => c.value === selectedCondition);
      const activeLabel = selectedItem ? selectedItem.label : '';

      const { data } = await api.put(`/analytics/${id}/conditions`, {
        crStatus: selectedCondition, // Numeric value 1-10 or null
        activeCondition: activeLabel,
        onHoldDeadline: selectedCondition === 2 ? onHoldDeadlineInput : null,
      });

      setRecord(data);
      toast.success(
        activeLabel
          ? `Condition updated to "${activeLabel}" and CR Status persisted.`
          : 'Condition cleared. CR Status set to NA.'
      );
      setIsConditionsOpen(false);
    } catch (err) {
      console.error('Conditions update error:', err);
      toast.error(err.response?.data?.message || 'Failed to update conditions');
    } finally {
      setSavingConditions(false);
    }
  };

  // Open Remarks Modal (read-only if existing remarks exist)
  const handleOpenRemarksModal = () => {
    const existing = record?.remarks ? record.remarks.trim() : '';
    setRemarks(existing);
    setIsEditingRemarks(!existing);
    setIsRemarksOpen(true);
  };

  // Save Remarks
  const handleSaveRemarks = async () => {
    setSavingRemarks(true);
    try {
      const { data } = await api.put(`/analytics/${id}/remarks`, {
        remarks: remarks.trim(),
      });
      setRecord(data);
      toast.success(record?.remarks ? 'Remarks updated successfully' : 'Remarks saved successfully');
      setIsEditingRemarks(false);
    } catch (err) {
      console.error('Remarks update error:', err);
      toast.error(err.response?.data?.message || 'Failed to save remarks');
    } finally {
      setSavingRemarks(false);
    }
  };

  // Cancel Remarks editing
  const handleCancelRemarksEdit = () => {
    setRemarks(record?.remarks ? record.remarks.trim() : '');
    setIsEditingRemarks(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleBack}
            className="p-2.5 bg-white border border-[#D8E9E2] hover:bg-[#D5F5E7] text-[#07566A] rounded-xl transition-all shadow-xs group flex items-center space-x-1.5"
            title="Back to Analytics Info"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
            <span className="text-xs font-bold hidden sm:inline">Back to Analytics Info</span>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
              <span>Sourcing Audit Trails</span>
              {record?.idnumber && (
                <span className="px-2.5 py-0.5 text-xs font-extrabold rounded-lg bg-[#D5F5E7] text-[#07566A] border border-[#00B96B]/30">
                  {record.idnumber}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500">
              Detailed chronological status transition logs, actions, and audit trail records
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50"
            title="Refresh Audit Trails"
          >
            <RotateCw size={14} className={refreshing ? 'animate-spin text-[#00B96B]' : 'text-slate-500'} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* View Mode Toggle: Timeline vs Table */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'timeline'
                  ? 'bg-white text-[#07566A] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Timeline View"
            >
              <GitCommit size={14} />
              <span className="hidden md:inline">Timeline</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-[#07566A] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <List size={14} />
              <span className="hidden md:inline">Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. DETAILS SECTION (Candidate / Record Details Summary Card) */}
      {record && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#07566A] to-[#043845] flex items-center justify-center text-white font-extrabold text-sm shadow-xs flex-shrink-0">
                <Building2 size={20} />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h2 className="text-base font-extrabold text-slate-800 tracking-tight">
                    {record.companyName || 'Candidate Record'}
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">•</span>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    {record.domain || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1 flex-wrap gap-y-1">
                  {record.location && (
                    <span className="flex items-center space-x-1">
                      <MapPin size={12} className="text-slate-400" />
                      <span>{record.location}</span>
                    </span>
                  )}
                  {record.resourcePerson && (
                    <span className="flex items-center space-x-1">
                      <User size={12} className="text-slate-400" />
                      <span>Assigned to: <strong className="text-slate-700">{record.resourcePerson}</strong></span>
                    </span>
                  )}
                  {record.portalLink && (
                    <a
                      href={record.portalLink.startsWith('http') ? record.portalLink : `https://${record.portalLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-[#00B96B] hover:underline font-semibold"
                    >
                      <ExternalLink size={12} />
                      <span>Portal Link</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* CR Status & Total Logs */}
            <div className="flex items-center space-x-3 flex-wrap gap-y-2">
              <div className="flex flex-col sm:items-end">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  CR Status
                </span>
                <div className="mt-1">
                  {getCrStatusLabel(record.crStatus) !== 'NA' ? (
                    <span className="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-[#D9FFF0] text-[#047857] border border-[#00D98B]/40 shadow-2xs inline-block">
                      {getCrStatusLabel(record.crStatus)}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-500 border border-slate-200 inline-block">
                      NA
                    </span>
                  )}
                </div>
              </div>

              <div className="h-8 w-px bg-slate-200 hidden sm:block" />

              <div className="flex flex-col sm:items-end">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Total Audit Logs
                </span>
                <span className="text-sm font-extrabold text-[#07566A] mt-0.5">
                  {historyList.length} {historyList.length === 1 ? 'record' : 'records'}
                </span>
              </div>
            </div>
          </div>

          {/* On-Hold Active Warning Banner */}
          {isOnHoldWarningVisible && (
            <div className="mt-4 p-3.5 bg-gradient-to-r from-amber-50 via-amber-50/90 to-amber-100/60 border border-amber-300 rounded-xl flex items-center space-x-3 text-amber-900 shadow-2xs animate-fade-in">
              <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 flex-shrink-0">
                <AlertTriangle size={18} className="animate-pulse" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-black tracking-tight text-amber-950">
                  Current item is on-hold until {formatDeadlineDate(record.onHoldDeadline)}.
                </p>
                <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                  Active deadline registered in Conditions Required. Sourcing actions are temporarily paused.
                </p>
              </div>
            </div>
          )}

          {/* Quick Contact & Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 text-xs">
            <div className="flex items-center space-x-2 text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
              <Mail size={13} className="text-[#00B96B] flex-shrink-0" />
              <div className="overflow-hidden">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Email</span>
                <span className="truncate block font-medium text-slate-700">{record.email || '—'}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
              <Phone size={13} className="text-[#00B96B] flex-shrink-0" />
              <div className="overflow-hidden">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Contact</span>
                <span className="truncate block font-medium text-slate-700">{record.contactNumber || '—'}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
              <Calendar size={13} className="text-[#00B96B] flex-shrink-0" />
              <div className="overflow-hidden">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Created On</span>
                <span className="truncate block font-medium text-slate-700">
                  {formatDateDDMMYYYY(record.createdAt || record.createdOn) || '—'}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
              <Clock size={13} className="text-[#00B96B] flex-shrink-0" />
              <div className="overflow-hidden">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Last Updated</span>
                <span className="truncate block font-medium text-slate-700">
                  {formatDateTimeDDMMYYYY(record.updatedOn) || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ACTION SECTION – TABS */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm transition-all">
        <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00B96B] ring-4 ring-[#00B96B]/20" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[#07566A]">
              Action Section
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Quick documentation, profile, and condition management
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Request Letter */}
          <button
            type="button"
            onClick={() => {
              setRequestLetterFile(null);
              setRequestLetterError('');
              setIsRequestLetterOpen(true);
            }}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 hover:border-[#00B96B] bg-slate-50/70 hover:bg-[#D5F5E7]/40 text-[#07566A] transition-all group shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 group-hover:border-[#00B96B]/50 flex items-center justify-center text-[#07566A] group-hover:text-[#00B96B] mb-2 shadow-2xs transition-colors">
              <FileText size={18} />
            </div>
            <span className="text-xs font-bold text-center">Request Letter</span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">
              {(record?.requestLetter?.fileUrl || record?.requestLetter?.path) ? 'Document Available' : 'No Docs'}
            </span>
          </button>

          {/* 2. URL Letter */}
          <button
            type="button"
            onClick={() => {
              setUrlLetterFile(null);
              setUrlLetterError('');
              setIsUrlLetterOpen(true);
            }}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 hover:border-[#00B96B] bg-slate-50/70 hover:bg-[#D5F5E7]/40 text-[#07566A] transition-all group shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 group-hover:border-[#00B96B]/50 flex items-center justify-center text-[#07566A] group-hover:text-[#00B96B] mb-2 shadow-2xs transition-colors">
              <FileCode size={18} />
            </div>
            <span className="text-xs font-bold text-center">URL Letter</span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">
              {(record?.urlLetter?.fileUrl || record?.urlLetter?.path) ? 'Document Available' : 'No Docs'}
            </span>
          </button>

          {/* 3. Company Profile */}
          <button
            type="button"
            onClick={() => {
              setCompanyProfileFile(null);
              setCompanyProfileError('');
              setIsCompanyProfileOpen(true);
            }}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 hover:border-[#00B96B] bg-slate-50/70 hover:bg-[#D5F5E7]/40 text-[#07566A] transition-all group shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 group-hover:border-[#00B96B]/50 flex items-center justify-center text-[#07566A] group-hover:text-[#00B96B] mb-2 shadow-2xs transition-colors">
              <Building2 size={18} />
            </div>
            <span className="text-xs font-bold text-center">Company Profile</span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">
              {(record?.companyProfile?.fileUrl || record?.companyProfile?.path) ? 'Document Available' : 'No Docs'}
            </span>
          </button>

          {/* 4. Email Pack */}
          <button
            type="button"
            onClick={() => setIsEmailPackOpen(true)}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 hover:border-[#00B96B] bg-slate-50/70 hover:bg-[#D5F5E7]/40 text-[#07566A] transition-all group shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 group-hover:border-[#00B96B]/50 flex items-center justify-center text-[#07566A] group-hover:text-[#00B96B] mb-2 shadow-2xs transition-colors">
              <Mail size={18} />
            </div>
            <span className="text-xs font-bold text-center">Email Pack</span>
            <span className="text-[10px] text-amber-600 font-semibold mt-0.5">
              On Progress
            </span>
          </button>

          {/* 5. Conditions Required */}
          <button
            type="button"
            onClick={handleOpenConditionsModal}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 hover:border-[#00B96B] bg-slate-50/70 hover:bg-[#D5F5E7]/40 text-[#07566A] transition-all group shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 group-hover:border-[#00B96B]/50 flex items-center justify-center text-[#07566A] group-hover:text-[#00B96B] mb-2 shadow-2xs transition-colors">
              <CheckSquare size={18} />
            </div>
            <span className="text-xs font-bold text-center">Conditions Required</span>
            <span className="text-[10px] text-[#00B96B] font-semibold mt-0.5 truncate max-w-[120px]">
              {getCrStatusLabel(record?.crStatus) !== 'NA' ? getCrStatusLabel(record?.crStatus) : 'None Active'}
            </span>
          </button>

          {/* 6. Remarks */}
          <button
            type="button"
            onClick={handleOpenRemarksModal}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 hover:border-[#00B96B] bg-slate-50/70 hover:bg-[#D5F5E7]/40 text-[#07566A] transition-all group shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 group-hover:border-[#00B96B]/50 flex items-center justify-center text-[#07566A] group-hover:text-[#00B96B] mb-2 shadow-2xs transition-colors">
              <MessageSquare size={18} />
            </div>
            <span className="text-xs font-bold text-center">Remarks</span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-[120px]">
              {record?.remarks ? 'Has Remarks' : 'Add Note'}
            </span>
          </button>
        </div>
      </div>

      {/* 3. SEARCH AUDIT LOG SECTION */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
          {/* Search Box */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              Search Audit Logs
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search description, updated by, status..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-800"
            >
              <option value="">All Statuses</option>
              {recruitmentFilterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order Toggle */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              Sort Order
            </label>
            <div className="flex items-center space-x-2">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-800"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                  title="Reset filters"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Loading State */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Spinner />
            <span className="text-xs text-slate-500 font-medium">Loading sourcing audit trails...</span>
          </div>
        ) : error ? (
          /* Error State */
          <div className="py-20 px-6 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Unable to load audit trails</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{error}</p>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={() => fetchData()}
                className="px-4 py-2 bg-[#07566A] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#043845] transition-all"
              >
                Retry
              </button>
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all"
              >
                Return to Analytics
              </button>
            </div>
          </div>
        ) : historyList.length === 0 ? (
          /* Empty State - No logs */
          <div className="py-20 px-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">No Audit Trail Records</h3>
              <p className="text-xs text-slate-400 mt-1">
                There are no status transition logs recorded for this candidate yet.
              </p>
            </div>
            <button
              onClick={handleBack}
              className="mt-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-[#07566A] text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              Back to Analytics Info
            </button>
          </div>
        ) : filteredHistory.length === 0 ? (
          /* Filtered empty state */
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <Search size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">No Matching Audit Records</h3>
              <p className="text-xs text-slate-400 mt-1">
                No audit trail logs match your filter criteria. Try adjusting your search or status filter.
              </p>
            </div>
            <button
              onClick={resetFilters}
              className="mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
            >
              Clear Filters
            </button>
          </div>
        ) : viewMode === 'timeline' ? (
          /* 1. TIMELINE VIEW */
          <div className="p-6 sm:p-8">
            <div className="relative border-l-2 border-[#00B96B]/30 pl-6 sm:pl-8 ml-3 space-y-8 text-slate-800">
              {paginatedHistory.map((hist, idx) => {
                const globalIndex = sortOrder === 'desc'
                  ? totalFiltered - ((page - 1) * limit + idx)
                  : (page - 1) * limit + idx + 1;
                const isLatest = sortOrder === 'desc' && page === 1 && idx === 0;

                return (
                  <div key={hist._id || idx} className="relative group">
                    {/* Node Circle on Timeline */}
                    <div
                      className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center transition-transform group-hover:scale-125 ${
                        isLatest
                          ? 'bg-[#00B96B] ring-4 ring-[#00B96B]/20 animate-pulse'
                          : 'bg-[#07566A]'
                      }`}
                    />

                    {/* Timeline Item Content Card */}
                    <div className="bg-slate-50/70 hover:bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs transition-all space-y-3">
                      {/* Header: Status badge, Transition #, and Timestamp */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-200/60">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <StatusBadge status={hist.status} type="recruitment" />
                          {isLatest && (
                            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide rounded-md bg-[#D9FFF0] text-[#047857] border border-[#00D98B]/30">
                              Latest State
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 font-bold">
                            Transition #{globalIndex}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
                          <Calendar size={13} className="text-[#00B96B]" />
                          <span>{formatDateTimeDDMMYYYY(hist.updatedOn)}</span>
                        </div>
                      </div>

                      {/* Description / Reasoning Note */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                          Transition Note / Reasoning
                        </span>
                        <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed font-normal whitespace-pre-wrap">
                          {hist.description || 'No detailed note provided.'}
                        </p>
                      </div>

                      {/* Footer: User who executed this transition */}
                      <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                        <div className="flex items-center space-x-1.5">
                          <User size={12} className="text-slate-400" />
                          <span>
                            Updated by: <strong className="text-slate-800 font-bold">{hist.updatedBy || 'System'}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* 2. TABLE VIEW */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Description / Action Note</th>
                  <th className="py-3 px-4">Updated By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedHistory.map((hist, idx) => {
                  const globalIndex = sortOrder === 'desc'
                    ? totalFiltered - ((page - 1) * limit + idx)
                    : (page - 1) * limit + idx + 1;
                  const isLatest = sortOrder === 'desc' && page === 1 && idx === 0;

                  return (
                    <tr key={hist._id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-500">
                        {globalIndex}
                        {isLatest && (
                          <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-[#00B96B]" title="Latest" />
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                        {formatDateTimeDDMMYYYY(hist.updatedOn)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={hist.status} type="recruitment" />
                      </td>
                      <td className="py-3.5 px-4 max-w-md">
                        <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-wrap">
                          {hist.description}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-800">
                        {hist.updatedBy || 'System'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination Controls */}
        {!loading && totalFiltered > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-200 bg-slate-50/50">
            <span className="text-xs text-slate-500 text-center sm:text-left">
              Showing <span className="font-semibold text-slate-800">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-slate-800">
                {Math.min(page * limit, totalFiltered)}
              </span>{' '}
              of <span className="font-semibold text-slate-800">{totalFiltered}</span> audit logs
              {hasActiveFilters && ` (filtered from ${historyList.length} total)`}
            </span>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all shadow-xs"
                  title="Previous Page"
                >
                  <ChevronLeft size={14} />
                </button>

                {/* Page indicator pill */}
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#07566A]">
                  Page {page} of {totalPages}
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all shadow-xs"
                  title="Next Page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Items per page selector */}
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none"
              >
                <option value={5}>5 / page</option>
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ACTION SECTION MODALS                                                     */}
      {/* ========================================================================= */}

      {/* 1. REQUEST LETTER MODAL */}
      <Modal
        isOpen={isRequestLetterOpen}
        onClose={() => setIsRequestLetterOpen(false)}
        title="Request Letter"
        maxWidth="max-w-lg"
      >
        <div className="space-y-5 text-slate-800">
          {/* Current Document View */}
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Uploaded Document
            </h4>
            {(record?.requestLetter?.fileUrl || record?.requestLetter?.path) ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-[#D9FFF0] border border-[#00D98B]/30 flex items-center justify-center text-[#047857] flex-shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="overflow-hidden">
                    <h5 className="text-xs font-bold text-slate-800 truncate" title={record.requestLetter.fileName || record.requestLetter.name}>
                      {record.requestLetter.fileName || record.requestLetter.name || 'Request-Letter'}
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {(record.requestLetter.fileSize || record.requestLetter.size)
                        ? `${((record.requestLetter.fileSize || record.requestLetter.size) / 1024).toFixed(1)} KB`
                        : 'Attached'}{' '}
                      • {formatDateDDMMYYYY(record.requestLetter.uploadedAt)}
                      {record.requestLetter.uploadedBy && ` • By ${record.requestLetter.uploadedBy}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <a
                    href={getAnalyticsDocumentUrl(record?._id, 'request-letter')}
                    onClick={(e) => {
                      e.preventDefault();
                      viewAnalyticsDocument(
                        record?._id,
                        'request-letter',
                        record.requestLetter.fileName || record.requestLetter.name
                      );
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white border border-slate-200 hover:bg-[#D5F5E7] text-[#07566A] rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
                    title="View Document"
                  >
                    <Eye size={14} />
                    <span className="hidden sm:inline">View</span>
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      downloadAnalyticsDocument(
                        record?._id,
                        'request-letter',
                        record.requestLetter.fileName || record.requestLetter.name || 'Request-Letter'
                      )
                    }
                    className="p-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
                    title="Download Document"
                  >
                    <Download size={14} />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-1.5">
                <div className="w-9 h-9 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                  <FileQuestion size={18} />
                </div>
                <p className="text-xs font-extrabold text-slate-600">No Docs Uploaded</p>
                <p className="text-[11px] text-slate-400">There is currently no Request Letter attached to this record.</p>
              </div>
            )}
          </div>

          {/* Upload Section - Available only to Admin users */}
          {isAdmin ? (
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {(record?.requestLetter?.fileUrl || record?.requestLetter?.path) ? 'Replace Request Letter' : 'Upload Request Letter'}
                </label>
                <span className="text-[11px] font-semibold text-slate-400">
                  Max size: <strong className="text-slate-600">100 KB</strong>
                </span>
              </div>

              <div className="space-y-2">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  onChange={(e) => handleFileSelect(e, setRequestLetterFile, setRequestLetterError)}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#D5F5E7] file:text-[#07566A] hover:file:bg-[#00D98B]/20 cursor-pointer border border-slate-200 rounded-xl p-1.5 bg-slate-50"
                />
                {requestLetterError && (
                  <p className="text-xs text-red-600 font-semibold">{requestLetterError}</p>
                )}
                {requestLetterFile && !requestLetterError && (
                  <div className="flex items-center justify-between text-xs text-slate-600 bg-[#EAF8F3] p-2.5 rounded-xl border border-[#00B96B]/30">
                    <span className="truncate font-medium">{requestLetterFile.name}</span>
                    <span className="font-bold text-[#00B96B] flex-shrink-0 ml-2">
                      {(requestLetterFile.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRequestLetterOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleUploadRequestLetter}
                  disabled={!requestLetterFile || !!requestLetterError || uploadingRequestLetter}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-[#00D98B] to-[#00B96B] text-[#07566A] font-extrabold text-xs rounded-xl shadow-xs hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <Upload size={14} className={uploadingRequestLetter ? 'animate-bounce' : ''} />
                  <span>{uploadingRequestLetter ? 'Uploading...' : 'Upload Document'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsRequestLetterOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* 2. URL LETTER MODAL */}
      <Modal
        isOpen={isUrlLetterOpen}
        onClose={() => setIsUrlLetterOpen(false)}
        title="URL Letter"
        maxWidth="max-w-lg"
      >
        <div className="space-y-5 text-slate-800">
          {/* Current Document View */}
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Uploaded Document
            </h4>
            {(record?.urlLetter?.fileUrl || record?.urlLetter?.path) ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-[#D9FFF0] border border-[#00D98B]/30 flex items-center justify-center text-[#047857] flex-shrink-0">
                    <FileCode size={20} />
                  </div>
                  <div className="overflow-hidden">
                    <h5 className="text-xs font-bold text-slate-800 truncate" title={record.urlLetter.fileName || record.urlLetter.name}>
                      {record.urlLetter.fileName || record.urlLetter.name || 'URL-Letter'}
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {(record.urlLetter.fileSize || record.urlLetter.size)
                        ? `${((record.urlLetter.fileSize || record.urlLetter.size) / 1024).toFixed(1)} KB`
                        : 'Attached'}{' '}
                      • {formatDateDDMMYYYY(record.urlLetter.uploadedAt)}
                      {record.urlLetter.uploadedBy && ` • By ${record.urlLetter.uploadedBy}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <a
                    href={getAnalyticsDocumentUrl(record?._id, 'url-letter')}
                    onClick={(e) => {
                      e.preventDefault();
                      viewAnalyticsDocument(
                        record?._id,
                        'url-letter',
                        record.urlLetter.fileName || record.urlLetter.name
                      );
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white border border-slate-200 hover:bg-[#D5F5E7] text-[#07566A] rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
                    title="View Document"
                  >
                    <Eye size={14} />
                    <span className="hidden sm:inline">View</span>
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      downloadAnalyticsDocument(
                        record?._id,
                        'url-letter',
                        record.urlLetter.fileName || record.urlLetter.name || 'URL-Letter'
                      )
                    }
                    className="p-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
                    title="Download Document"
                  >
                    <Download size={14} />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-1.5">
                <div className="w-9 h-9 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                  <FileQuestion size={18} />
                </div>
                <p className="text-xs font-extrabold text-slate-600">No Docs Uploaded</p>
                <p className="text-[11px] text-slate-400">There is currently no URL Letter attached to this record.</p>
              </div>
            )}
          </div>

          {/* Upload Section - Available only to Admin users */}
          {isAdmin ? (
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {(record?.urlLetter?.fileUrl || record?.urlLetter?.path) ? 'Replace URL Letter' : 'Upload URL Letter'}
                </label>
                <span className="text-[11px] font-semibold text-slate-400">
                  Max size: <strong className="text-slate-600">100 KB</strong>
                </span>
              </div>

              <div className="space-y-2">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  onChange={(e) => handleFileSelect(e, setUrlLetterFile, setUrlLetterError)}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#D5F5E7] file:text-[#07566A] hover:file:bg-[#00D98B]/20 cursor-pointer border border-slate-200 rounded-xl p-1.5 bg-slate-50"
                />
                {urlLetterError && (
                  <p className="text-xs text-red-600 font-semibold">{urlLetterError}</p>
                )}
                {urlLetterFile && !urlLetterError && (
                  <div className="flex items-center justify-between text-xs text-slate-600 bg-[#EAF8F3] p-2.5 rounded-xl border border-[#00B96B]/30">
                    <span className="truncate font-medium">{urlLetterFile.name}</span>
                    <span className="font-bold text-[#00B96B] flex-shrink-0 ml-2">
                      {(urlLetterFile.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUrlLetterOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleUploadUrlLetter}
                  disabled={!urlLetterFile || !!urlLetterError || uploadingUrlLetter}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-[#00D98B] to-[#00B96B] text-[#07566A] font-extrabold text-xs rounded-xl shadow-xs hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <Upload size={14} className={uploadingUrlLetter ? 'animate-bounce' : ''} />
                  <span>{uploadingUrlLetter ? 'Uploading...' : 'Upload Document'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsUrlLetterOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* 3. COMPANY PROFILE MODAL */}
      <Modal
        isOpen={isCompanyProfileOpen}
        onClose={() => setIsCompanyProfileOpen(false)}
        title="Company Profile"
        maxWidth="max-w-lg"
      >
        <div className="space-y-5 text-slate-800">
          {/* Current Document View */}
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Uploaded Document
            </h4>
            {(record?.companyProfile?.fileUrl || record?.companyProfile?.path) ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-[#D9FFF0] border border-[#00D98B]/30 flex items-center justify-center text-[#047857] flex-shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="overflow-hidden">
                    <h5 className="text-xs font-bold text-slate-800 truncate" title={record.companyProfile.fileName || record.companyProfile.name}>
                      {record.companyProfile.fileName || record.companyProfile.name || 'Company-Profile'}
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {(record.companyProfile.fileSize || record.companyProfile.size)
                        ? `${((record.companyProfile.fileSize || record.companyProfile.size) / 1024).toFixed(1)} KB`
                        : 'Attached'}{' '}
                      • {formatDateDDMMYYYY(record.companyProfile.uploadedAt)}
                      {record.companyProfile.uploadedBy && ` • By ${record.companyProfile.uploadedBy}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <a
                    href={getAnalyticsDocumentUrl(record?._id, 'company-profile')}
                    onClick={(e) => {
                      e.preventDefault();
                      viewAnalyticsDocument(
                        record?._id,
                        'company-profile',
                        record.companyProfile.fileName || record.companyProfile.name
                      );
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white border border-slate-200 hover:bg-[#D5F5E7] text-[#07566A] rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
                    title="View Document"
                  >
                    <Eye size={14} />
                    <span className="hidden sm:inline">View</span>
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      downloadAnalyticsDocument(
                        record?._id,
                        'company-profile',
                        record.companyProfile.fileName || record.companyProfile.name || 'Company-Profile'
                      )
                    }
                    className="p-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
                    title="Download Document"
                  >
                    <Download size={14} />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-1.5">
                <div className="w-9 h-9 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                  <FileQuestion size={18} />
                </div>
                <p className="text-xs font-extrabold text-slate-600">No Docs Uploaded</p>
                <p className="text-[11px] text-slate-400">There is currently no Company Profile document attached to this record.</p>
              </div>
            )}
          </div>

          {/* Upload Section - Available only to Admin users */}
          {isAdmin ? (
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {(record?.companyProfile?.fileUrl || record?.companyProfile?.path) ? 'Replace Company Profile' : 'Upload Company Profile'}
                </label>
                <span className="text-[11px] font-semibold text-slate-400">
                  Max size: <strong className="text-slate-600">100 KB</strong>
                </span>
              </div>

              <div className="space-y-2">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  onChange={(e) => handleFileSelect(e, setCompanyProfileFile, setCompanyProfileError)}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#D5F5E7] file:text-[#07566A] hover:file:bg-[#00D98B]/20 cursor-pointer border border-slate-200 rounded-xl p-1.5 bg-slate-50"
                />
                {companyProfileError && (
                  <p className="text-xs text-red-600 font-semibold">{companyProfileError}</p>
                )}
                {companyProfileFile && !companyProfileError && (
                  <div className="flex items-center justify-between text-xs text-slate-600 bg-[#EAF8F3] p-2.5 rounded-xl border border-[#00B96B]/30">
                    <span className="truncate font-medium">{companyProfileFile.name}</span>
                    <span className="font-bold text-[#00B96B] flex-shrink-0 ml-2">
                      {(companyProfileFile.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCompanyProfileOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleUploadCompanyProfile}
                  disabled={!companyProfileFile || !!companyProfileError || uploadingCompanyProfile}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-[#00D98B] to-[#00B96B] text-[#07566A] font-extrabold text-xs rounded-xl shadow-xs hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <Upload size={14} className={uploadingCompanyProfile ? 'animate-bounce' : ''} />
                  <span>{uploadingCompanyProfile ? 'Uploading...' : 'Upload Document'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCompanyProfileOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* 4. EMAIL PACK MODAL */}
      <Modal
        isOpen={isEmailPackOpen}
        onClose={() => setIsEmailPackOpen(false)}
        title="Email Pack"
        maxWidth="max-w-md"
      >
        <div className="py-8 px-4 text-center space-y-4 text-slate-800">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#D5F5E7] border border-[#00B96B]/30 flex items-center justify-center text-[#07566A] shadow-xs">
            <Mail size={28} className="text-[#00B96B]" />
          </div>

          <div className="space-y-1.5">
            <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-black uppercase tracking-wider rounded-lg shadow-2xs">
              On Progress
            </span>
            <h4 className="text-sm font-extrabold text-slate-800">Email Pack Dispatch</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Email pack template generator, automated sourcing notices, and batch messaging capabilities are currently on progress.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsEmailPackOpen(false)}
              className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      </Modal>

      {/* 5. CONDITIONS REQUIRED MODAL (TWO CONDITIONS PER ROW & MUTUALLY EXCLUSIVE) */}
      <Modal
        isOpen={isConditionsOpen}
        onClose={() => setIsConditionsOpen(false)}
        title="Conditions Required"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-2 border-b border-slate-100">
            <p className="text-xs text-slate-500">
              Select one active condition for record <strong className="text-slate-800">{record?.idnumber}</strong>.
            </p>
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-[11px] text-slate-400">
                Active Condition:{' '}
                <strong className="text-[#00B96B]">
                  {getCrStatusLabel(selectedCondition)}
                </strong>
              </span>
              {selectedCondition && (
                <button
                  type="button"
                  onClick={() => setSelectedCondition(null)}
                  className="text-[11px] font-bold text-slate-400 hover:text-red-600 hover:underline"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>

          {/* 10 Toggle Switches in Exactly Two Columns (Two conditions per row on desktop) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
            {CONDITIONS_LIST.map((cond) => {
              const isSelected = selectedCondition === cond.value;
              return (
                <div
                  key={cond.value}
                  onClick={() => handleToggleCondition(cond.value)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#EAF8F3] border-[#00B96B] shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="overflow-hidden min-w-0">
                    <span className={`text-xs font-bold block truncate ${isSelected ? 'text-[#07566A]' : 'text-slate-800'}`}>
                      {cond.label}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                      {cond.desc}
                    </span>
                  </div>

                  {/* Single-selection Toggle Switch Button */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isSelected}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleCondition(cond.value);
                    }}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isSelected ? 'bg-[#00B96B]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        isSelected ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Mandatory On-Hold Deadline Date Picker (shown only when On-Hold (code 2) is selected) */}
          {selectedCondition === 2 && (
            <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2 animate-fade-in">
              <div className="flex items-center space-x-2 text-amber-900">
                <Calendar size={15} className="text-amber-600 flex-shrink-0" />
                <label className="text-xs font-black uppercase tracking-wider">
                  On-Hold Deadline Date <span className="text-red-500">*</span>
                </label>
              </div>
              <input
                type="date"
                value={onHoldDeadlineInput}
                min={toDateInputValue(new Date())}
                onChange={(e) => {
                  setOnHoldDeadlineInput(e.target.value);
                  setOnHoldDeadlineError('');
                }}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
              />
              {onHoldDeadlineError && (
                <p className="text-xs text-red-600 font-semibold">{onHoldDeadlineError}</p>
              )}
              <p className="text-[11px] text-amber-800">
                Mandatory: A warning stating <span className="font-semibold">&quot;Current item is on-hold until [Selected Deadline Date]&quot;</span> will display in the details section until this date is reached.
              </p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              CR Status will be:{' '}
              <strong className="text-[#07566A]">
                {getCrStatusLabel(selectedCondition)}
              </strong>
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsConditionsOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveConditions}
                disabled={savingConditions}
                className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-[#00D98B] to-[#00B96B] text-[#07566A] font-extrabold text-xs rounded-xl shadow-xs hover:shadow-sm disabled:opacity-50 transition-all cursor-pointer"
              >
                <Check size={14} className={savingConditions ? 'animate-spin' : ''} />
                <span>{savingConditions ? 'Saving...' : 'Save Condition'}</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* 6. REMARKS MODAL (READ-ONLY BY DEFAULT & EDIT WORKFLOW) */}
      <Modal
        isOpen={isRemarksOpen}
        onClose={() => setIsRemarksOpen(false)}
        title="Remarks"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-slate-800">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Candidate Sourcing Remarks
              </label>
              {!isEditingRemarks && record?.remarks && (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                  Read-Only Mode
                </span>
              )}
            </div>

            {/* Read-only view vs Editable textarea */}
            {!isEditingRemarks ? (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-wrap min-h-[90px] select-text">
                {remarks || <span className="text-slate-400 italic">No remarks recorded yet.</span>}
              </div>
            ) : (
              <textarea
                rows={4}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter audit remarks, verification notes, or observations..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-800 text-xs leading-relaxed"
                autoFocus
              />
            )}
          </div>

          {/* Previous Remarks History if available */}
          {Array.isArray(record?.remarksHistory) && record.remarksHistory.length > 0 && (
            <div>
              <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Remarks History ({record.remarksHistory.length})
              </h5>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {record.remarksHistory
                  .slice()
                  .reverse()
                  .map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1"
                    >
                      <p className="text-slate-700 whitespace-pre-wrap">{item.remark}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span>By: <strong className="text-slate-600">{item.updatedBy || 'User'}</strong></span>
                        <span>{formatDateTimeDDMMYYYY(item.updatedOn)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Action buttons depending on mode */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            {!isEditingRemarks ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsRemarksOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingRemarks(true)}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-[#07566A] hover:bg-[#043845] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Edit2 size={13} />
                  <span>Edit</span>
                </button>
              </>
            ) : (
              <>
                {record?.remarks ? (
                  <button
                    type="button"
                    onClick={handleCancelRemarksEdit}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsRemarksOpen(false)}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all"
                  >
                    Close
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveRemarks}
                  disabled={savingRemarks}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-[#00D98B] to-[#00B96B] text-[#07566A] font-extrabold text-xs rounded-xl shadow-xs hover:shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Check size={14} className={savingRemarks ? 'animate-spin' : ''} />
                  <span>{savingRemarks ? 'Saving...' : record?.remarks ? 'Save' : 'Save'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default SourcingAuditTrails;
