import React, { useEffect, useState, useRef } from 'react';
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
  Download,
  Users as UsersIcon,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../api';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import { exportPaymentsToExcel } from '../utils/exportPaymentsExcel';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/dateFormatter';

// Local custom Status Badge to mimic the recruitment one but tailored for payments
const StatusBadge = ({ status }) => {
  let badgeClasses = "bg-slate-100 text-slate-600 border border-slate-200";
  
  if (status === 'Payment Pending') {
    badgeClasses = "bg-red-50 text-red-700 border border-red-200";
  } else if (status === 'Partially Paid') {
    badgeClasses = "bg-amber-50 text-amber-700 border border-amber-200";
  } else if (status === 'Payment Completed') {
    badgeClasses = "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }

  return (
    <div className={`inline-flex items-center justify-center px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide rounded-md shadow-xs ${badgeClasses}`}>
      {status || 'Unknown'}
    </div>
  );
};

const PAYMENT_STATUS_OPTIONS = [
  { value: 'Payment Pending', label: 'Payment Pending' },
  { value: 'Partially Paid', label: 'Partially Paid' },
  { value: 'Payment Completed', label: 'Payment Completed' }
];

const Payments = () => {
  // State for records list & meta
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Dashboard Metrics
  const [metrics, setMetrics] = useState({
    totalClients: 0,
    totalPayout: 0,
    pendingPayout: 0
  });
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientIdFilter, setClientIdFilter] = useState('');
  const [clientNameFilter, setClientNameFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { user } = useAuth();
  const isAdmin = user?.email === 'admin@elitehire.com';
  
  // Sorting state
  const [sortBy, setSortBy] = useState('updatedOn');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals visibility state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isInstallmentOpen, setIsInstallmentOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form selections and data fields
  const [activeRecord, setActiveRecord] = useState(null);
  const [installmentHistory, setInstallmentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Payment input form state
  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    totalAmount: '',
    paidAmount: '',
    remarks: '',
  });
  
  const [clientValidationMsg, setClientValidationMsg] = useState('');
  const [isValidatingClient, setIsValidatingClient] = useState(false);

  // Installment input form state
  const [installmentData, setInstallmentData] = useState({
    amount: '',
    remarks: ''
  });

  const [formErrors, setFormErrors] = useState({});

  // Fetch Dashboard Metrics
  const fetchDashboardMetrics = async () => {
    try {
      const { data } = await api.get('/payments/dashboard', {
        params: { search, status: statusFilter, clientId: clientIdFilter, clientName: clientNameFilter }
      });
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard metrics', error);
    }
  };

  // Fetch list of records
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payments', {
        params: {
          page,
          limit,
          search,
          status: statusFilter,
          clientId: clientIdFilter,
          clientName: clientNameFilter,
          sortBy,
          sortOrder
        }
      });
      if (data.success) {
        setRecords(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalRecords(data.pagination.totalRecords);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
      toast.error('Failed to load payment records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchDashboardMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, statusFilter, clientIdFilter, clientNameFilter, sortBy, sortOrder]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRecords();
    fetchDashboardMetrics();
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

  const hasActiveFilters = Boolean(search || statusFilter || clientIdFilter || clientNameFilter);

  const fetchAllRecordsForExport = async () => {
    const pageSize = 100;
    const filterParams = { search, status: statusFilter, clientId: clientIdFilter, clientName: clientNameFilter, sortBy, sortOrder };
    const allRecords = [];
    let currentPage = 1;
    let pagesToFetch = 1;

    do {
      const { data } = await api.get('/payments', {
        params: { page: currentPage, limit: pageSize, ...filterParams },
      });
      allRecords.push(...(data.data || []));
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
      const filenamePrefix = hasActiveFilters ? 'payments-filtered' : 'payments-all';
      exportPaymentsToExcel(exportRecords, filenamePrefix);
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
    setClientIdFilter('');
    setClientNameFilter('');
    setPage(1);
  };

  // Open Create Form modal
  const handleAddClick = () => {
    setActiveRecord(null);
    setFormData({
      clientId: '',
      clientName: '',
      totalAmount: '',
      paidAmount: '',
      remarks: '',
    });
    setFormErrors({});
    setClientValidationMsg('');
    setIsAddEditOpen(true);
  };

  // Open Edit Form modal
  const handleEditClick = (record) => {
    setActiveRecord(record);
    setFormData({
      clientId: record.clientId || '',
      clientName: record.clientName || '',
      totalAmount: record.totalAmount || '',
      paidAmount: '', // Not editable via this modal
      remarks: '',
    });
    setFormErrors({});
    setClientValidationMsg('');
    setIsAddEditOpen(true);
  };

  // Debounced Client ID lookup
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.clientId.trim() && !activeRecord) {
        validateClientId(formData.clientId.trim());
      }
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.clientId]);

  const validateClientId = async (clientId) => {
    setIsValidatingClient(true);
    setClientValidationMsg('');
    try {
      const { data } = await api.get('/clients', {
        params: { search: clientId, limit: 10 }
      });
      // Find exact match just to be absolutely sure
      const exactMatch = data.records.find(c => c.clientId.toUpperCase() === clientId.toUpperCase());
      if (exactMatch) {
        setFormData(prev => ({ ...prev, clientName: exactMatch.clientName }));
        setClientValidationMsg('');
      } else {
        setFormData(prev => ({ ...prev, clientName: '' }));
        setClientValidationMsg('Client ID not found.');
      }
    } catch (error) {
      setFormData(prev => ({ ...prev, clientName: '' }));
      setClientValidationMsg('Client ID not found.');
    } finally {
      setIsValidatingClient(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.clientId.trim()) {
      errors.clientId = 'Client ID is required';
    } else if (clientValidationMsg) {
      errors.clientId = clientValidationMsg;
    }
    if (!formData.clientName.trim()) {
      errors.clientName = 'Valid Client ID required to populate Client Name';
    }
    if (!formData.totalAmount || Number(formData.totalAmount) <= 0) {
      errors.totalAmount = 'Total amount must be greater than zero';
    }
    if (formData.paidAmount !== '' && Number(formData.paidAmount) < 0) {
      errors.paidAmount = 'Paid amount cannot be negative';
    }
    
    // Total Amount Validation
    const amountPaidSoFar = activeRecord ? activeRecord.paidAmount : 0;
    if (activeRecord && Number(formData.totalAmount) < amountPaidSoFar) {
      errors.totalAmount = `Total amount cannot be less than already paid (₹${amountPaidSoFar.toLocaleString()})`;
    }

    // New Installment Validation
    const dueAmountForEdit = activeRecord 
      ? Number(formData.totalAmount) - amountPaidSoFar 
      : Number(formData.totalAmount);
      
    if (formData.paidAmount !== '' && Number(formData.paidAmount) > dueAmountForEdit) {
      errors.paidAmount = `Paid amount cannot exceed the due amount (₹${dueAmountForEdit.toLocaleString()})`;
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the highlighted form errors.');
      return;
    }
    
    // Safety block: prevent submission if still validating
    if (isValidatingClient || clientValidationMsg) {
      toast.error('Please resolve Client ID validation first.');
      return;
    }

    try {
      if (activeRecord) {
        await api.put(`/payments/${activeRecord.id || activeRecord._id}`, {
          clientId: formData.clientId.trim(),
          clientName: formData.clientName.trim(),
          totalAmount: formData.totalAmount,
          paidAmount: formData.paidAmount,
          remarks: formData.remarks,
        });
        toast.success('Payment Record Updated Successfully.');
      } else {
        await api.post('/payments', formData);
        toast.success('New Payment Created Successfully.');
      }
      setIsAddEditOpen(false);
      fetchRecords();
      fetchDashboardMetrics();
    } catch (error) {
      console.error(
        "Payment API Error:",
        error.response?.data || error
      );
      toast.error(error.response?.data?.message || 'Error processing record.');
    }
  };

  const validateInstallmentForm = () => {
    const errors = {};
    if (!installmentData.amount || Number(installmentData.amount) <= 0) {
      errors.amount = 'Installment amount must be greater than zero';
    } else if (activeRecord && Number(installmentData.amount) > activeRecord.dueAmount) {
      errors.amount = `Amount exceeds due amount (₹${activeRecord.dueAmount.toLocaleString()})`;
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInstallmentClick = (record) => {
    setActiveRecord(record);
    setInstallmentData({ amount: '', remarks: '' });
    setFormErrors({});
    setIsInstallmentOpen(true);
  };

  const handleSaveInstallment = async (e) => {
    e.preventDefault();
    if (!validateInstallmentForm()) {
      toast.error('Please fix the highlighted form errors.');
      return;
    }

    try {
      await api.put(`/payments/${activeRecord.id || activeRecord._id}/installment`, installmentData);
      toast.success('Installment Payment Added Successfully.');
      setIsInstallmentOpen(false);
      fetchRecords();
      fetchDashboardMetrics();
    } catch (error) {
      console.error(
        "Installment API Error:",
        error.response?.data || error
      );
      toast.error(error.response?.data?.message || 'Error adding installment');
    }
  };

  const handleHistoryClick = async (record) => {
    setActiveRecord(record);
    setInstallmentHistory(record.installments || []);
    setIsHistoryOpen(true);
  };

  const handleDeleteClick = (record) => {
    setActiveRecord(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/payments/${activeRecord.id || activeRecord._id}`);
      toast.success('Payment Deleted Successfully.');
      setIsDeleteOpen(false);
      fetchRecords();
      fetchDashboardMetrics();
    } catch (error) {
      console.error(
        "Payment API Error:",
        error.response?.data || error
      );
      toast.error(error.response?.data?.message || 'Failed to remove record.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Payments Info</h1>
          <p className="text-xs text-slate-500">Configure parameters, verify payments, and track installment audit trails</p>
        </div>
        <button
          onClick={handleAddClick}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-brand-800 to-blue-700 hover:from-brand-700 hover:to-blue-600 text-white font-bold text-xs rounded-xl shadow-glow-brand transition-all uppercase tracking-wider"
        >
          <Plus size={16} />
          <span>Add Info</span>
        </button>
      </div>

      {/* Dashboard Cards (Same as Analytics Info styling) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between transition-transform duration-300 hover:-translate-y-1 hover:shadow-md group">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Clients</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-brand-800 transition-colors">
              {metrics.totalClients}
            </h3>
          </div>
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center group-hover:bg-brand-50 group-hover:border-brand-100 transition-colors">
            <UsersIcon className="text-slate-400 group-hover:text-brand-700 transition-colors" size={24} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between transition-transform duration-300 hover:-translate-y-1 hover:shadow-md group">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Payout</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-brand-800 transition-colors">
              ₹{metrics.totalPayout.toLocaleString()}
            </h3>
          </div>
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center group-hover:bg-brand-50 group-hover:border-brand-100 transition-colors">
            <CheckSquare className="text-slate-400 group-hover:text-brand-700 transition-colors" size={24} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between transition-transform duration-300 hover:-translate-y-1 hover:shadow-md group">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pending Payout</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-brand-800 transition-colors">
              ₹{metrics.pendingPayout.toLocaleString()}
            </h3>
          </div>
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center group-hover:bg-brand-50 group-hover:border-brand-100 transition-colors">
            <DollarSign className="text-slate-400 group-hover:text-brand-700 transition-colors" size={24} />
          </div>
        </div>
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
                placeholder="Search payments..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            </div>
          </div>

          {/* Client ID filter */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Filter Client ID</label>
            <input
              type="text"
              value={clientIdFilter}
              onChange={(e) => setClientIdFilter(e.target.value)}
              placeholder="e.g. CLT-0001"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
            />
          </div>

          {/* Status filter */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Filter Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
            >
              <option value="">All Statuses</option>
              {PAYMENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
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
            <p className="text-slate-500 text-sm font-semibold">No payment records logged in this database</p>
            <p className="text-xs text-slate-400">Try modifying your query or adding new records.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-extrabold tracking-wider text-slate-500">
                  <th onClick={() => handleSort('paymentId')} className="px-6 py-4 cursor-pointer hover:text-slate-800 whitespace-nowrap min-w-[120px]">
                    <div className="flex items-center space-x-1">
                      <span>Payment ID</span>
                      {sortBy === 'paymentId' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('clientId')} className="px-6 py-4 cursor-pointer hover:text-slate-800">
                    <div className="flex items-center space-x-1">
                      <span>Client ID</span>
                      {sortBy === 'clientId' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('clientName')} className="px-6 py-4 cursor-pointer hover:text-slate-800">
                    <div className="flex items-center space-x-1">
                      <span>Client Name</span>
                      {sortBy === 'clientName' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('totalAmount')} className="px-6 py-4 cursor-pointer hover:text-slate-800">
                    <div className="flex items-center space-x-1">
                      <span>Total Amount</span>
                      {sortBy === 'totalAmount' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th className="px-6 py-4">Paid Amount</th>
                  <th className="px-6 py-4">Due Amount</th>
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
                  <tr key={r.id || r._id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-extrabold text-brand-800 whitespace-nowrap min-w-[120px]">{r.paymentId}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]" title={r.clientId}>{r.clientId}</td>
                    <td className="px-6 py-4 text-slate-700 font-medium">{r.clientName || '—'}</td>
                    <td className="px-6 py-4 text-slate-900 font-black">₹{r.totalAmount?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-emerald-600 font-extrabold">₹{r.paidAmount?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-red-600 font-extrabold">₹{r.dueAmount?.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <div className="text-[10px] text-slate-700 font-medium">{formatDateDDMMYYYY(r.updatedOn)}</div>
                      <div className="text-[9px] text-slate-400">By {r.updatedBy}</div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        {r.dueAmount > 0 && (
                          <button
                            onClick={() => handleInstallmentClick(r)}
                            className="p-1.5 bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all text-slate-500"
                            title="Add Installment"
                          >
                            <DollarSign size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => handleHistoryClick(r)}
                          className="p-1.5 bg-slate-50 border border-slate-200 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all text-slate-500"
                          title="Show Installment History"
                        >
                          <History size={13} />
                        </button>
                        <button
                          onClick={() => handleEditClick(r)}
                          className="p-1.5 bg-slate-50 border border-slate-200 hover:border-brand-300 hover:text-brand-800 hover:bg-brand-50 rounded-lg transition-all text-slate-500"
                          title="Edit Main Fields"
                        >
                          <Edit2 size={13} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteClick(r)}
                            className="p-1.5 bg-slate-50 border border-slate-200 hover:border-red-300 hover:text-red-650 hover:bg-red-50 rounded-lg transition-all text-slate-500"
                            title="Delete Payment"
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
              of <span className="font-semibold text-slate-800">{totalRecords}</span> records
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

      {/* 1. CREATE / EDIT MODAL */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={activeRecord ? `Modify Payment: ${activeRecord.paymentId}` : 'Add Payment Info'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAddEditSubmit} className="space-y-4 text-slate-800">
          {activeRecord && (
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 flex justify-between items-center text-xs">
              <div>
                <p className="text-brand-800 font-bold uppercase tracking-wider text-[9px]">Total Amount</p>
                <p className="font-extrabold text-slate-800">₹{activeRecord.totalAmount.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-emerald-700 font-bold uppercase tracking-wider text-[9px]">Total Paid</p>
                <p className="font-extrabold text-emerald-700">₹{activeRecord.paidAmount.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-red-600 font-bold uppercase tracking-wider text-[9px]">Remaining Due</p>
                <p className="font-extrabold text-red-600">₹{activeRecord.dueAmount.toLocaleString()}</p>
              </div>
            </div>
          )}
          
          {activeRecord && activeRecord.installments && activeRecord.installments.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs max-h-32 overflow-y-auto">
              <p className="text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-2">Previous Installments</p>
              <div className="space-y-2">
                {activeRecord.installments.map((inst, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                    <span className="font-extrabold text-emerald-600">₹{inst.amount.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400">{formatDateTimeDDMMYYYY(inst.recordedOn)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Client ID *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  disabled={!!activeRecord} // Disable if editing (per usual pattern)
                  value={formData.clientId}
                  onChange={(e) => {
                    setFormData({ ...formData, clientId: e.target.value.toUpperCase() });
                    setClientValidationMsg('');
                  }}
                  className={`w-full px-3.5 py-2.5 bg-slate-50/70 border rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs ${formErrors.clientId || clientValidationMsg ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-slate-200'}`}
                />
                {isValidatingClient && (
                  <div className="absolute right-3 top-2.5">
                    <Spinner size="small" />
                  </div>
                )}
              </div>
              {clientValidationMsg && (
                <p className="text-[10px] text-red-600 mt-1">{clientValidationMsg}</p>
              )}
              {formErrors.clientId && !clientValidationMsg && (
                <p className="text-[10px] text-red-600 mt-1">{formErrors.clientId}</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Client Name</label>
              <input
                type="text"
                readOnly
                value={formData.clientName}
                placeholder="Auto-populated"
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-xs font-semibold cursor-not-allowed"
              />
              {formErrors.clientName && (
                <p className="text-[10px] text-red-600 mt-1">{formErrors.clientName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Total Amount *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                className={`w-full px-3.5 py-2.5 bg-slate-50/70 border rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs ${formErrors.totalAmount ? 'border-red-400' : 'border-slate-200'}`}
                placeholder="0.00"
              />
              {formErrors.totalAmount && (
                <p className="text-[10px] text-red-600 mt-1">{formErrors.totalAmount}</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                {activeRecord ? 'New Installment Amount' : 'Initial Paid Amount'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.paidAmount}
                onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                className={`w-full px-3.5 py-2.5 bg-slate-50/70 border rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs ${formErrors.paidAmount ? 'border-red-400' : 'border-slate-200'}`}
                placeholder="0.00"
              />
              {formErrors.paidAmount && (
                <p className="text-[10px] text-red-600 mt-1">{formErrors.paidAmount}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              {activeRecord ? 'Installment Remarks / Reference' : 'Remarks'}
            </label>
            <textarea
              rows={2}
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs animate-none"
              placeholder={activeRecord ? "Add reference for this new installment..." : "Add initial payment remarks..."}
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
              disabled={isValidatingClient || !!clientValidationMsg}
              className="w-full sm:flex-1 py-2.5 bg-gradient-to-r from-brand-800 to-blue-700 hover:from-brand-700 hover:to-blue-600 text-white font-bold text-xs rounded-xl shadow-glow-brand transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {activeRecord ? 'Save Changes' : 'Add Info'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. ADD INSTALLMENT MODAL */}
      <Modal
        isOpen={isInstallmentOpen}
        onClose={() => setIsInstallmentOpen(false)}
        title={`Add Installment: ${activeRecord?.paymentId}`}
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleSaveInstallment} className="space-y-4 text-slate-800">
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 flex justify-between items-center text-xs">
            <div>
              <p className="text-brand-800 font-bold uppercase tracking-wider text-[9px]">Total</p>
              <p className="font-extrabold text-slate-800">₹{activeRecord?.totalAmount.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-red-600 font-bold uppercase tracking-wider text-[9px]">Remaining Due</p>
              <p className="font-extrabold text-red-600">₹{activeRecord?.dueAmount.toLocaleString()}</p>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Installment Amount *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={activeRecord?.dueAmount}
              required
              value={installmentData.amount}
              onChange={(e) => setInstallmentData({ ...installmentData, amount: e.target.value })}
              className={`w-full px-3.5 py-2.5 bg-slate-50/70 border rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs ${formErrors.amount ? 'border-red-400' : 'border-slate-200'}`}
              placeholder="0.00"
            />
            {formErrors.amount && (
              <p className="text-[10px] text-red-600 mt-1">{formErrors.amount}</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Remarks / Reference Number</label>
            <textarea
              rows={2}
              value={installmentData.remarks}
              onChange={(e) => setInstallmentData({ ...installmentData, remarks: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs animate-none"
              placeholder="e.g. RTGS, Check #1234"
            />
          </div>

          <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsInstallmentOpen(false)}
              className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm"
            >
              Record Payment
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. SHOW HISTORY AUDIT TRAIL MODAL */}
      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title={`Payment Ledger: ${activeRecord?.paymentId}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
            <div>
              <p className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Status</p>
              <div className="mt-1">
                <StatusBadge status={activeRecord?.status} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Total Due</p>
              <p className="font-extrabold text-red-600">₹{activeRecord?.dueAmount.toLocaleString()}</p>
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto pr-1">
            {installmentHistory.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <History size={36} className="text-slate-300 mx-auto" />
                <p className="text-slate-500 text-sm font-semibold">No installments logged yet.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                {installmentHistory.map((item, index) => (
                  <div key={index} className="relative pl-5">
                    {/* Timeline Node */}
                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-4 ring-emerald-50"></div>
                    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount Paid</p>
                          <p className="text-sm font-extrabold text-emerald-600">₹{item.amount.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-medium">
                            {formatDateTimeDDMMYYYY(item.recordedOn)}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex justify-between items-end">
                        {item.remarks ? (
                          <p className="text-[11px] text-slate-600 italic">"{item.remarks}"</p>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">No remarks provided</p>
                        )}
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                          By {item.recordedBy}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => setIsHistoryOpen(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              Close Ledger
            </button>
          </div>
        </div>
      </Modal>

      {/* 4. DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Deletion"
        maxWidth="max-w-sm"
      >
        <div className="space-y-5">
          <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-100 text-xs leading-relaxed">
            <p className="font-bold mb-1">Warning: Irreversible Action</p>
            You are about to permanently delete payment record <strong>{activeRecord?.paymentId}</strong> for <strong>{activeRecord?.clientName}</strong>. This will also remove all associated installment history.
          </div>
          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={() => setIsDeleteOpen(false)}
              className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Delete Record
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Payments;
