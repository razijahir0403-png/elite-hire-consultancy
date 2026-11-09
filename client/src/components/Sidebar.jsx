import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../context/ChatContext';
import {
  LayoutDashboard,
  BarChart3,
  Building2,
  CheckSquare,
  LogOut,
  X,
  Users as UsersIcon,
  DollarSign,
  Briefcase,
  MessageSquare,
  RotateCw,
  Check
} from 'lucide-react';
import rasLogo from '../assets/ras.jpeg';
import Modal from './Modal';
import ThreeBarLogo from './ThreeBarLogo';
import api from '../api';
import { recruitmentFilterOptions, getStatusLabel, RECEIVED_INFO_STATUS_OPTIONS } from '../utils/statusMaster';
import { clientFilterOptions, CLIENT_STATUS } from '../utils/clientStatusMaster';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { logout, endSession, user, isAdmin } = useAuth();
  const { totalUnread } = useChat();
  const location = useLocation();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Detect if on the Analytics Info Audit Trail screen
  const auditTrailMatch = location.pathname.match(
    /(?:\/analytics\/|\/sourcing-audit-trails\/)([^\/]+)(?:\/audit-trails)?/
  );
  const auditRecordId = auditTrailMatch ? auditTrailMatch[1] : null;
  const isAuditTrailScreen = Boolean(
    auditRecordId && (location.pathname.includes('/audit-trails') || location.pathname.includes('/sourcing-audit-trails'))
  );

  // Detect if on the Data Received (Clients) Audit Trail screen
  const clientAuditTrailMatch = location.pathname.match(
    /\/dashboard\/clients\/([^\/]+)\/audit-trail/
  );
  const clientAuditRecordId = clientAuditTrailMatch ? clientAuditTrailMatch[1] : null;
  const isClientAuditTrailScreen = Boolean(clientAuditRecordId);

  // Detect if on the Received Info Sourcing Audit Trail screen
  const receivedInfoAuditTrailMatch = location.pathname.match(
    /\/dashboard\/received-info\/([^\/]+)\/audit-trail/
  );
  const receivedInfoAuditRecordId = receivedInfoAuditTrailMatch ? receivedInfoAuditTrailMatch[1] : null;
  const isReceivedInfoAuditTrailScreen = Boolean(receivedInfoAuditRecordId);

  // Combined: on any audit trail screen
  const isAnyAuditScreen = isAuditTrailScreen || isClientAuditTrailScreen || isReceivedInfoAuditTrailScreen;

  // Update Status form state in sidebar
  const [statusType, setStatusType] = useState('');
  const [comment, setComment] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  // Clear update status form when navigating away
  useEffect(() => {
    if (!isAnyAuditScreen) {
      setStatusType('');
      setComment('');
      setSavingStatus(false);
    }
  }, [isAnyAuditScreen, location.pathname]);

  // Received Info workflow status options (from centralized integer mapping)
  // Using RECEIVED_INFO_STATUS_OPTIONS from statusMaster.js which provides { value: number, label: string }
  const receivedInfoStatusOptions = RECEIVED_INFO_STATUS_OPTIONS;

  // Handle Save for Analytics Info Audit Trail
  const handleSaveStatus = async (e) => {
    if (e) e.preventDefault();
    if (statusType === '') {
      toast.error('Please select a valid Status Type');
      return;
    }
    if (!comment.trim()) {
      toast.error('Please enter a comment before saving');
      return;
    }
    if (!auditRecordId) {
      toast.error('Audit trail record ID not found');
      return;
    }

    setSavingStatus(true);
    try {
      const numericStatus = Number(statusType);
      const { data } = await api.put(`/analytics/update-status/${auditRecordId}`, {
        status: numericStatus,
        description: comment.trim(),
      });

      // Dispatch event to refresh Audit Trail History and details immediately
      window.dispatchEvent(new CustomEvent('audit-trail-updated', { detail: data }));

      // Clear textarea and reset dropdown after successful save
      setComment('');
      setStatusType('');

      const label = getStatusLabel('recruitment', numericStatus);
      toast.success(`Workflow Status (${label}) and audit trail recorded successfully!`);
    } catch (err) {
      console.error('Update status error:', err);
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  };

  // Handle Save for Data Received (Clients) Audit Trail
  const handleSaveClientStatus = async (e) => {
    if (e) e.preventDefault();
    if (statusType === '') {
      toast.error('Please select a valid Status Type');
      return;
    }
    if (!comment.trim()) {
      toast.error('Please enter a comment before saving');
      return;
    }
    if (!clientAuditRecordId) {
      toast.error('Client audit trail record ID not found');
      return;
    }

    setSavingStatus(true);
    try {
      const numericStatus = Number(statusType);
      const { data } = await api.put(`/clients/update-status/${clientAuditRecordId}`, {
        status: numericStatus,
        description: comment.trim(),
      });

      // Dispatch event to refresh ClientsAuditTrail page immediately
      window.dispatchEvent(new CustomEvent('audit-trail-updated', { detail: data }));

      // Clear form after successful save
      setComment('');
      setStatusType('');

      const matchedOpt = clientFilterOptions.find((o) => o.value === numericStatus);
      const label = matchedOpt ? matchedOpt.label : String(numericStatus);
      toast.success(`CR Status (${label}) and audit log recorded successfully!`);
    } catch (err) {
      console.error('Client update status error:', err);
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  };

  // Handle Save for Received Info Sourcing Audit Trail
  const handleSaveReceivedInfoStatus = async (e) => {
    if (e) e.preventDefault();
    if (statusType === '') {
      toast.error('Please select a valid Status Type');
      return;
    }
    if (!comment.trim()) {
      toast.error('Please enter a comment before saving');
      return;
    }
    if (!receivedInfoAuditRecordId) {
      toast.error('Received Info audit trail record ID not found');
      return;
    }

    // Convert statusType to integer (from string like "1", "2", etc.)
    const statusInt = Number(statusType);

    setSavingStatus(true);
    try {
      const { data } = await api.put(`/received-info/update-status/${receivedInfoAuditRecordId}`, {
        status: statusInt,
        description: comment.trim(),
      });

      // Dispatch event to refresh audit trail page immediately
      window.dispatchEvent(new CustomEvent('audit-trail-updated', { detail: data }));

      // Clear form after successful save
      setComment('');
      setStatusType('');

      const matchedOpt = receivedInfoStatusOptions.find((o) => o.value === statusInt);
      const label = matchedOpt ? matchedOpt.label : statusInt;
      toast.success(`RI Status (${label}) and audit trail recorded successfully!`);
    } catch (err) {
      console.error('Received Info update status error:', err);
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  };

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      exact: true
    },
    {
      name: 'Analytics Info',
      path: '/dashboard/analytics',
      icon: BarChart3
    },
    {
      name: 'Data Received',
      path: '/dashboard/clients',
      icon: Building2
    },
    {
      name: 'Received Info',
      path: '/dashboard/received-info',
      icon: CheckSquare
    },
    ...(isAdmin ? [
      {
        name: 'Payments Info',
        path: '/dashboard/payments',
        icon: DollarSign
      },
      {
        name: 'System Users',
        path: '/dashboard/users',
        icon: UsersIcon
      },
      {
        name: 'Employees Info',
        path: '/dashboard/employees',
        icon: Briefcase
      }
    ] : [
      {
        name: 'About',
        path: '/dashboard/employees',
        icon: Briefcase
      }
    ])
  ];

  // Build the Update Status panel JSX (shared layout, different options/handler)
  const renderUpdateStatusPanel = () => {
    const isClient = isClientAuditTrailScreen;
    const isReceivedInfo = isReceivedInfoAuditTrailScreen;
    
    let options, handleSave, selectedLabelPrefix;
    
    if (isClient) {
      options = clientFilterOptions;
      handleSave = handleSaveClientStatus;
      selectedLabelPrefix = 'CR Status';
    } else if (isReceivedInfo) {
      options = receivedInfoStatusOptions;
      handleSave = handleSaveReceivedInfoStatus;
      selectedLabelPrefix = 'RI Status';
    } else {
      options = recruitmentFilterOptions;
      handleSave = handleSaveStatus;
      selectedLabelPrefix = 'Workflow Status';
    }
    
    const selectedLabel = statusType !== ''
      ? (options.find((o) => o.value === Number(statusType))?.label || '')
      : '';

    return (
      <div className="bg-[#F8FAFC] dark:bg-[#121212]/70 p-3.5 rounded-2xl border border-[#B8C0CC] dark:border-[#475569] shadow-2xs space-y-3.5 text-[#111827] dark:text-[#F8FAFC] transition-colors duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#B8C0CC] dark:border-[#475569]">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#00B96B]" />
            <span className="text-xs font-black uppercase tracking-wider text-[#111827] dark:text-[#FFFFFF]">
              Update Status
            </span>
          </div>
          {statusType !== '' && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#00B96B] animate-pulse" />
          )}
        </div>

        {/* Status Type Dropdown */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-[#374151] dark:text-[#E2E8F0] uppercase tracking-wider block">
            Status Type
          </label>
          <select
            value={statusType}
            onChange={(e) => setStatusType(e.target.value)}
            className="w-full px-2.5 py-2 bg-white dark:bg-[#1E293B] border border-[#AEB7C4] dark:border-[#475569] rounded-xl text-[#111827] dark:text-[#FFFFFF] text-xs font-semibold focus:outline-none focus:border-[#00B96B] focus:ring-1 focus:ring-[#00B96B]"
          >
            <option value="">Select Workflow Status</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {statusType !== '' && selectedLabel && (
            <div className="pt-0.5">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-[#D9FFF0] dark:bg-[#0E3D48] px-2 py-0.5 rounded-md border border-[#00D98B]/30 dark:border-[#00D98B]/40 font-bold inline-block truncate max-w-full">
                {selectedLabel}
              </span>
            </div>
          )}
        </div>

        {/* Comment Session Textarea */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-[#374151] dark:text-[#E2E8F0] uppercase tracking-wider block">
            Comment Session
          </label>
          <textarea
            rows={4}
            disabled={statusType === '' || savingStatus}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              statusType !== ''
                ? `Enter remarks for ${selectedLabel}...`
                : 'Select a Status Type to enable comments...'
            }
            className={`w-full px-2.5 py-2 rounded-xl text-xs transition-all border leading-relaxed ${
              statusType !== ''
                ? 'bg-white dark:bg-[#1E293B] border-[#AEB7C4] dark:border-[#475569] text-[#111827] dark:text-[#FFFFFF] placeholder-[#6B7280] dark:placeholder-[#A1AAB8] focus:outline-none focus:border-[#00B96B] focus:ring-1 focus:ring-[#00B96B]'
                : 'bg-[#F8FAFC] dark:bg-[#121212]/60 border-[#AEB7C4] dark:border-[#475569] text-[#9CA3AF] placeholder-[#6B7280] dark:placeholder-[#A1AAB8] cursor-not-allowed resize-none'
            }`}
          />
        </div>

        {/* Save Button */}
        <button
          type="button"
          disabled={statusType === '' || !comment.trim() || savingStatus}
          onClick={handleSave}
          className={`w-full py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-all shadow-xs ${
            statusType !== '' && comment.trim() && !savingStatus
              ? 'bg-gradient-to-r from-[#00D98B] to-[#00B96B] hover:from-[#00E99A] hover:to-[#00D98B] text-[#043845] dark:text-[#043845] shadow-[0_4px_14px_rgba(0,217,139,0.3)] hover:shadow-[0_6px_18px_rgba(0,217,139,0.4)] active:scale-[0.98] cursor-pointer'
              : 'bg-slate-100 dark:bg-[#1E293B]/60 border border-[#B8C0CC] dark:border-[#475569] text-[#9CA3AF] cursor-not-allowed'
          }`}
        >
          {savingStatus ? (
            <>
              <RotateCw size={14} className="animate-spin text-[#00B96B]" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Check size={15} />
              <span>Save</span>
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#043845]/50 dark:bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={toggleSidebar}
        />
      )}

      {/* Main Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-[#1E293B] border-r border-[#B8C0CC] dark:border-[#475569] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex lg:flex-col lg:h-screen shadow-sm ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header with Eleventis Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#B8C0CC] dark:border-[#475569] bg-white dark:bg-[#1E293B] transition-colors duration-200">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="bg-[#F8FAFC] dark:bg-[#121212] p-1 rounded-xl border border-[#B8C0CC] dark:border-[#475569] flex items-center justify-center w-11 h-11 shadow-sm overflow-hidden flex-shrink-0 group">
              <img src={rasLogo} alt="Eleventis Logo" className="w-full h-full object-contain" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-sm font-black tracking-tight text-[#111827] dark:text-[#FFFFFF] truncate">
                Eleventis
              </h1>
              <p className="text-[8px] text-[#00B96B] dark:text-emerald-400 font-extrabold uppercase tracking-widest truncate mt-0.5">
                Data • Talent • Solutions
              </p>
            </div>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-1.5 rounded-xl text-[#374151] dark:text-[#E2E8F0] hover:bg-[#F8FAFC] dark:hover:bg-[#121212] hover:text-[#111827] dark:hover:text-[#FFFFFF] transition-colors border border-transparent hover:border-[#B8C0CC] dark:hover:border-[#475569]"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Info Profile section */}
        <div className="px-5 py-3.5 border-b border-[#B8C0CC] dark:border-[#475569] bg-[#F8FAFC] dark:bg-[#121212]/50 transition-colors duration-200">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#07566A] to-[#043845] dark:from-[#0E3D48] dark:to-[#04242C] flex items-center justify-center text-white font-extrabold text-sm shadow-[0_2px_8px_rgba(7,86,106,0.25)] border border-[#B8C0CC] dark:border-[#475569]">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#00B96B] border-2 border-white dark:border-[#1E293B] rounded-full shadow-xs" title="Online" />
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC] truncate">{user?.name}</h4>
              <span className="text-[11px] text-[#374151] dark:text-[#E2E8F0] truncate block">
                {isAdmin ? 'System Administrator' : 'Employee Portal'}
              </span>
            </div>
          </div>

          {/* Dedicated Chat Button below user profile */}
          <NavLink
            to="/dashboard/chat"
            onClick={() => {
              if (window.innerWidth < 1024) toggleSidebar();
            }}
            className={({ isActive }) =>
              `mt-3 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 border group ${
                isActive
                  ? 'bg-[#00B96B] text-white border-[#00B96B] shadow-xs'
                  : 'bg-white dark:bg-[#121212] text-[#111827] dark:text-[#F8FAFC] border-[#B8C0CC] dark:border-[#475569] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] hover:border-[#00B96B]/50 hover:text-[#00B96B] dark:hover:text-emerald-300 shadow-2xs'
              }`
            }
          >
            <div className="flex items-center space-x-2">
              <MessageSquare size={15} className="flex-shrink-0" />
              <span>Chat</span>
            </div>
            {totalUnread > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-black leading-none text-white bg-red-500 rounded-full shadow-xs animate-pulse">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </NavLink>
        </div>

        {/* Navigation Menu / Update Status Section */}
        <nav className="flex-1 px-3.5 py-4 overflow-y-auto">
          {isAnyAuditScreen ? (
            renderUpdateStatusPanel()
          ) : (
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth < 1024) toggleSidebar();
                    }}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 border border-transparent group ${
                        isActive
                          ? 'bg-[#D5F5E7] dark:bg-[#0E3D48] text-[#07566A] dark:text-emerald-300 border-[#00B96B] shadow-xs'
                          : 'text-[#374151] dark:text-[#E2E8F0] hover:bg-[#F8FAFC] dark:hover:bg-[#121212] hover:text-[#111827] dark:hover:text-[#FFFFFF] hover:border-[#B8C0CC] dark:hover:border-[#475569]'
                      }`
                    }
                    end={item.exact}
                  >
                    <Icon
                      size={17}
                      className={`transition-colors ${
                        isActive ? 'text-[#00B96B] dark:text-emerald-400' : 'text-[#374151] dark:text-[#E2E8F0] group-hover:text-[#111827] dark:group-hover:text-[#FFFFFF]'
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00B96B]" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          )}
        </nav>

        {/* Brand Mini Animated Mascot Footer */}
        <div className="px-5 py-3 border-t border-[#B8C0CC] dark:border-[#475569] bg-white dark:bg-[#1E293B] flex items-center justify-between transition-colors duration-200">
          <div className="flex items-center space-x-2">
            <ThreeBarLogo size="xs" animated={true} />
            <span className="text-[10px] font-extrabold text-[#111827] dark:text-[#F8FAFC] tracking-wider uppercase">
              Eleventis SaaS
            </span>
          </div>
          <span className="w-2 h-2 rounded-full bg-[#00B96B] animate-ping" />
        </div>

        {/* Footer actions */}
        <div className="p-3.5 border-t border-[#B8C0CC] dark:border-[#475569] bg-white dark:bg-[#1E293B] transition-colors duration-200">
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center justify-center space-x-2 w-full px-3.5 py-2.5 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/60 transition-all duration-200"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Logout / End Session Modal */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="End Current Session"
        maxWidth="max-w-md"
      >
        <div className="text-center py-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 mb-3 shadow-xs">
            <LogOut size={28} />
          </div>
          <h3 className="text-base font-extrabold text-[#111827] dark:text-[#FFFFFF] mb-2">
            Do you want to Logout completely or End this Session?
          </h3>
          <p className="text-xs text-[#374151] dark:text-[#E2E8F0] mb-6 px-4 leading-relaxed">
            If you <strong className="text-[#07566A] dark:text-emerald-300">End Session</strong>, your attendance session is closed and you can log in again later today.
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => {
                setIsLogoutModalOpen(false);
                endSession();
              }}
              className="w-full py-2.5 bg-gradient-to-r from-[#00D98B] to-[#00B96B] hover:from-[#00E99A] hover:to-[#00D98B] text-[#043845] dark:text-[#043845] rounded-xl text-xs font-extrabold transition-all shadow-[0_4px_14px_rgba(0,217,139,0.3)] active:scale-[0.98]"
            >
              End Session
            </button>
            <button
              onClick={() => {
                setIsLogoutModalOpen(false);
                logout();
              }}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
            >
              Logout completely
            </button>
            <button
              onClick={() => setIsLogoutModalOpen(false)}
              className="w-full py-2 text-[#374151] dark:text-[#E2E8F0] hover:text-[#111827] dark:hover:text-[#FFFFFF] rounded-xl text-xs font-bold transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Sidebar;
