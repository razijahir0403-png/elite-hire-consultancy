import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
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
  Eye,
  File,
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
import { validateProfilePdf } from '../utils/profileDocument';
import { fetchClientPdfBlobUrl, fetchClientProofPdfBlobUrl, revokeBlobUrl } from '../utils/clientDocument';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/dateFormatter';

const TEXT_FIELD_MAX_LENGTH = 200;

const emptyPdfPreview = () => ({
  name: '',
  clientId: null,
  blobUrl: null,
  docType: 'profile',
  loading: false,
  error: false,
});

const emptyForm = () => ({
  clientName: '',
  mobile: '',
  email: '',
  category: '',
  status: '',
  description: '',
});

const Clients = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { user } = useAuth();
  const isAdmin = user?.email === 'admin@elitehire.com';
  const [sortBy, setSortBy] = useState('updatedOn');
  const [sortOrder, setSortOrder] = useState('desc');

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);

  const [activeRecord, setActiveRecord] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(emptyPdfPreview());

  const [formData, setFormData] = useState(emptyForm());
  const [formErrors, setFormErrors] = useState({});
  const [profileFile, setProfileFile] = useState(null);
  const [existingDocumentName, setExistingDocumentName] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [existingProofName, setExistingProofName] = useState('');

  const [statusForm, setStatusForm] = useState({
    status: '',
    description: '',
  });

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/clients', {
        params: {
          page,
          limit,
          search,
          status: statusFilter,
          category: categoryFilter,
          sortBy,
          sortOrder,
        },
      });
      setRecords(data.records);
      setTotalPages(data.pagination.totalPages);
      setTotalRecords(data.pagination.totalRecords);
    } catch {
      toast.error('Failed to load clients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, limit, statusFilter, categoryFilter, sortBy, sortOrder]);

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

  const hasActiveFilters = Boolean(search || statusFilter || categoryFilter);

  const fetchAllRecordsForExport = async () => {
    const { data } = await api.get('/clients/export', {
      params: { search, status: statusFilter, category: categoryFilter, sortBy, sortOrder },
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
      const filenamePrefix = hasActiveFilters ? 'clients-filtered' : 'clients-all';
      exportClientsToExcel(exportRecords, filenamePrefix);
      toast.success(`Exported ${exportRecords.length} client record(s) to Excel.`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to export records.');
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setPage(1);
  };

  const handleAddClick = () => {
    setActiveRecord(null);
    setFormData(emptyForm());
    setFormErrors({});
    setProfileFile(null);
    setExistingDocumentName('');
    setProofFile(null);
    setExistingProofName('');
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
    setProfileFile(null);
    setExistingDocumentName(record.profileDocumentName || '');
    setProofFile(null);
    setExistingProofName(record.proofDocumentName || '');
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
    const pdfError = validateProfilePdf(profileFile);
    if (pdfError) {
      errors.profileDocument = pdfError;
    }
    const proofPdfError = validateProfilePdf(proofFile);
    if (proofPdfError) {
      errors.proofDocument = proofPdfError;
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
    if (profileFile) {
      fd.append('profileDocument', profileFile);
    }
    if (proofFile) {
      fd.append('proofDocument', proofFile);
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
        toast.success('Client updated successfully!');
      } else {
        await api.post('/clients', fd);
        toast.success('Client created successfully!');
      }
      setIsAddEditOpen(false);
      fetchRecords();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error processing client record.');
    }
  };

  const handleProfileFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    const pdfError = validateProfilePdf(file);
    if (pdfError) {
      setFormErrors((prev) => ({ ...prev, profileDocument: pdfError }));
      setProfileFile(null);
      e.target.value = '';
      return;
    }
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.profileDocument;
      return next;
    });
    setProfileFile(file);
  };

  const handleProofFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    const pdfError = validateProfilePdf(file);
    if (pdfError) {
      setFormErrors((prev) => ({ ...prev, proofDocument: pdfError }));
      setProofFile(null);
      e.target.value = '';
      return;
    }
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.proofDocument;
      return next;
    });
    setProofFile(file);
  };

  const handleDeleteClick = (record) => {
    setActiveRecord(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/clients/${activeRecord._id}`);
      toast.success('Client deleted.');
      setIsDeleteOpen(false);
      fetchRecords();
    } catch {
      toast.error('Failed to remove client.');
    }
  };

  const handleUpdateStatusClick = (record) => {
    setActiveRecord(record);
    setStatusForm({
      status: record.status ?? '',
      description: '',
    });
    setIsStatusOpen(true);
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!statusForm.description.trim()) {
      toast.error('Please specify a description for the status update');
      return;
    }
    try {
      await api.put(`/clients/update-status/${activeRecord._id}`, statusForm);
      toast.success('Status updated!');
      setIsStatusOpen(false);
      fetchRecords();
    } catch {
      toast.error('Failed to update status.');
    }
  };

  const handleHistoryClick = async (record) => {
    setActiveRecord(record);
    setHistoryLoading(true);
    setIsHistoryOpen(true);
    try {
      const { data } = await api.get(`/clients/history/${record._id}`);
      setHistoryList(data);
    } catch {
      toast.error('Could not fetch status history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const closePdfModal = () => {
    setPdfPreview((prev) => {
      revokeBlobUrl(prev.blobUrl);
      return emptyPdfPreview();
    });
    setIsPdfOpen(false);
  };

  const openPdfModal = async (record, type = 'profile') => {
    const hasDoc = type === 'profile' ? record.profileDocumentPath : record.proofDocumentPath;
    if (!hasDoc || !record._id) return;

    setPdfPreview({
      name: type === 'profile' ? (record.profileDocumentName || 'profile-document.pdf') : (record.proofDocumentName || 'proof-document.pdf'),
      clientId: record._id,
      docType: type,
      blobUrl: null,
      loading: true,
      error: false,
    });
    setIsPdfOpen(true);

    try {
      const blobUrl = type === 'profile' ? await fetchClientPdfBlobUrl(record._id) : await fetchClientProofPdfBlobUrl(record._id);
      setPdfPreview((prev) => ({
        ...prev,
        blobUrl,
        loading: false,
        error: false,
      }));
    } catch (error) {
      console.error('PDF preview load failed:', error);
      setPdfPreview((prev) => ({
        ...prev,
        loading: false,
        error: true,
      }));
    }
  };

  const handlePdfDownload = async () => {
    if (pdfPreview.blobUrl) {
      const link = document.createElement('a');
      link.href = pdfPreview.blobUrl;
      link.download = pdfPreview.name || (pdfPreview.docType === 'profile' ? 'profile-document.pdf' : 'proof-document.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (!pdfPreview.clientId) return;

    try {
      const blobUrl = pdfPreview.docType === 'profile' ? await fetchClientPdfBlobUrl(pdfPreview.clientId) : await fetchClientProofPdfBlobUrl(pdfPreview.clientId);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = pdfPreview.name || (pdfPreview.docType === 'profile' ? 'profile-document.pdf' : 'proof-document.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      revokeBlobUrl(blobUrl);
    } catch {
      toast.error('Unable to download document.');
    }
  };

  useEffect(
    () => () => {
      revokeBlobUrl(pdfPreview.blobUrl);
    },
    [pdfPreview.blobUrl]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Clients Info</h1>
          <p className="text-xs text-slate-500">Manage client profiles, documents, and workflow status history</p>
        </div>
        <button
          type="button"
          onClick={handleAddClick}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-brand-800 to-blue-700 hover:from-brand-700 hover:to-blue-600 text-white font-bold text-xs rounded-xl shadow-glow-brand transition-all uppercase tracking-wider"
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
            <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Category</label>
            <input
              type="text"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
            />
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
            <p className="text-slate-500 text-sm font-semibold">No clients found</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-extrabold tracking-wider text-slate-500">
                  <th onClick={() => handleSort('clientId')} className="px-6 py-4 cursor-pointer hover:text-slate-800 whitespace-nowrap min-w-[120px]">
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
                  <th className="px-6 py-4">Mobile</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-center">Profile Docs</th>
                  <th className="px-6 py-4 text-center">Proof Docs</th>
                  <th className="px-6 py-4">Status</th>
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
                    <td className="px-6 py-4 font-extrabold text-brand-800 whitespace-nowrap min-w-[120px]">{r.clientId}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{r.clientName}</td>
                    <td className="px-6 py-4 text-slate-600">{normalizeContactNumber(r.mobile) || '—'}</td>
                    <td className="px-6 py-4 text-slate-600 truncate max-w-[120px]" title={r.email}>{r.email || '—'}</td>
                    <td className="px-6 py-4 text-slate-600">{r.category || '—'}</td>
                    <td className="px-6 py-4 text-center">
                      {r.profileDocumentPath ? (
                        <button
                          type="button"
                          onClick={() => openPdfModal(r, 'profile')}
                          className="inline-flex p-2 rounded-lg bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 transition-all"
                          title="View profile document"
                        >
                          <File size={14} />
                        </button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {r.proofDocumentPath ? (
                        <button
                          type="button"
                          onClick={() => openPdfModal(r, 'proof')}
                          className="inline-flex p-2 rounded-lg bg-orange-50 border border-orange-100 text-orange-600 hover:bg-orange-100 transition-all"
                          title="View proof document"
                        >
                          <File size={14} />
                        </button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={r.status} type="client" />
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {formatDateDDMMYYYY(r.createdDate || r.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
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
                        <button type="button" onClick={() => handleUpdateStatusClick(r)} className="p-1.5 bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 rounded-lg text-slate-500" title="Update Status">
                          <CheckSquare size={13} />
                        </button>
                        <button type="button" onClick={() => handleHistoryClick(r)} className="p-1.5 bg-slate-50 border border-slate-200 hover:border-blue-300 hover:text-blue-700 rounded-lg text-slate-500" title="History">
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

        {!loading && records.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
            <span className="text-xs text-slate-500 text-center sm:text-left">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} clients
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
        title={activeRecord ? `Edit Client: ${activeRecord.clientId}` : 'Add Info'}
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
            {formErrors.category && (
              <p className="text-[10px] text-red-600 mt-1">{formErrors.category}</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Profile Document (PDF, max 200 KB)</label>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleProfileFileChange}
              className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-800 file:font-semibold"
            />
            {existingDocumentName && !profileFile && (
              <p className="text-[10px] text-slate-500 mt-1">Current file: {existingDocumentName}</p>
            )}
            {profileFile && (
              <p className="text-[10px] text-emerald-600 mt-1">New file selected: {profileFile.name}</p>
            )}
            {formErrors.profileDocument && (
              <p className="text-[10px] text-red-600 mt-1">{formErrors.profileDocument}</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Proof Document (PDF, max 200 KB)</label>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleProofFileChange}
              className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-orange-50 file:text-orange-800 file:font-semibold"
            />
            {existingProofName && !proofFile && (
              <p className="text-[10px] text-slate-500 mt-1">Current file: {existingProofName}</p>
            )}
            {proofFile && (
              <p className="text-[10px] text-emerald-600 mt-1">New file selected: {proofFile.name}</p>
            )}
            {formErrors.proofDocument && (
              <p className="text-[10px] text-red-600 mt-1">{formErrors.proofDocument}</p>
            )}
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
                {formErrors.status && (
                  <p className="text-[10px] text-red-600 mt-1">{formErrors.status}</p>
                )}
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
            <button type="submit" className="w-full sm:flex-1 py-2.5 bg-gradient-to-r from-brand-800 to-blue-700 text-white font-bold text-xs rounded-xl">
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
            {activeRecord.profileDocumentPath && (
              <button
                type="button"
                onClick={() => openPdfModal(activeRecord, 'profile')}
                className="flex items-center gap-2 text-brand-800 font-bold hover:underline"
              >
                <File size={14} /> View Profile Document
              </button>
            )}
            {activeRecord.proofDocumentPath && (
              <button
                type="button"
                onClick={() => openPdfModal(activeRecord, 'proof')}
                className="flex items-center gap-2 text-orange-600 font-bold hover:underline mt-1"
              >
                <File size={14} /> View Proof Document
              </button>
            )}
          </div>
        )}
      </Modal>

      {/* PDF Preview */}
      <Modal
        isOpen={isPdfOpen}
        onClose={closePdfModal}
        title={pdfPreview.name || 'Profile Document'}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 min-h-[50vh] flex flex-col overflow-hidden">
            {pdfPreview.loading && (
              <div className="flex-1 flex items-center justify-center py-16">
                <Spinner />
              </div>
            )}

            {!pdfPreview.loading && pdfPreview.blobUrl && (
              <iframe
                title="PDF Preview"
                src={`${pdfPreview.blobUrl}#toolbar=1&navpanes=0`}
                className="w-full flex-1 min-h-[50vh] bg-white"
              />
            )}

            {!pdfPreview.loading && pdfPreview.error && (
              <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 text-center space-y-3">
                <FileText size={40} className="text-slate-300" />
                <p className="text-sm text-slate-600 font-medium">
                  Preview unavailable. Click Download to view the document.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={closePdfModal}
              className="w-full sm:flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePdfDownload}
              disabled={pdfPreview.loading || (!pdfPreview.blobUrl && !pdfPreview.clientId)}
              className="w-full sm:flex-1 py-2.5 bg-brand-800 hover:bg-brand-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            >
              <Download size={14} />
              Download
            </button>
          </div>
        </div>
      </Modal>

      {/* Status */}
      <Modal isOpen={isStatusOpen} onClose={() => setIsStatusOpen(false)} title={`Update Status: ${activeRecord?.clientId}`}>
        <form onSubmit={handleStatusSubmit} className="space-y-4 text-slate-800">
          <select
            value={statusForm.status}
            onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value === '' ? '' : Number(e.target.value) })}
            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
          >
            <option value="">Select</option>
            {clientFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <textarea
            required
            rows={3}
            value={statusForm.description}
            onChange={(e) => setStatusForm({ ...statusForm, description: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-brand-800 focus:ring-1 focus:ring-brand-800 text-xs"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={() => setIsStatusOpen(false)} className="w-full sm:flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold">Close</button>
            <button type="submit" className="w-full sm:flex-1 py-2.5 bg-gradient-to-r from-brand-800 to-blue-700 text-white rounded-xl text-xs font-bold">Submit</button>
          </div>
        </form>
      </Modal>

      {/* History */}
      <Modal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} title={`Audit Trail: ${activeRecord?.clientId}`} maxWidth="max-w-md">
        {historyLoading ? (
          <div className="py-12 flex justify-center"><Spinner /></div>
        ) : historyList.length === 0 ? (
          <p className="text-center text-slate-400 text-xs py-8">No status history found.</p>
        ) : (
          <div className="relative border-l-2 border-slate-200 pl-4 ml-3 space-y-6">
            {historyList.map((hist, idx) => (
              <div key={hist._id || idx} className="relative">
                <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-brand-800 border border-white" />
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={hist.status} type="client" />
                    <span className="text-[10px] text-slate-400">{formatDateTimeDDMMYYYY(hist.updatedOn)}</span>
                  </div>
                  <p className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">{hist.description}</p>
                  <p className="text-[10px] text-slate-500">Updated by: <span className="font-bold">{hist.updatedBy}</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Delete */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirm Deletion">
        <p className="text-xs text-slate-600 mb-4">
          Delete client <span className="font-bold text-brand-800">{activeRecord?.clientId}</span>?
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
