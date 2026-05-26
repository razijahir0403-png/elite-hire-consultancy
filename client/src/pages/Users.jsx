import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Users as UsersIcon, ShieldAlert, RefreshCw, Mail, Calendar, KeyRound, UserCheck, UserX } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import Spinner from '../components/Spinner';

const Users = () => {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdmin = user && user.email === 'admin@elitehire.com';

  const fetchUsers = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/auth/users');
      setUsersList(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || 'Failed to retrieve registered users.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApproval = async (id, currentStatus) => {
    try {
      const targetStatus = !currentStatus;
      const { data } = await api.put(`/auth/users/${id}/approve`, { isApproved: targetStatus });
      toast.success(data.message || `User status updated successfully.`, {
        position: 'top-right',
        autoClose: 3000,
        theme: 'light'
      });
      fetchUsers();
    } catch (err) {
      console.error('Error toggling user approval:', err);
      toast.error(err.response?.data?.message || 'Failed to update user approval status.', {
        position: 'top-right',
        autoClose: 4000,
        theme: 'light'
      });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user]);

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 p-8 animate-fadeIn">
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl shadow-sm">
          <ShieldAlert size={48} className="animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Access Denied</h2>
        <p className="text-sm text-slate-500 text-center max-w-md leading-relaxed">
          This system administrative panel is restricted to the master administrator account. Your current session does not have access permissions.
        </p>
      </div>
    );
  }

  if (loading) return <Spinner fullPage />;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-brand-50 border border-brand-100 text-brand-800 rounded-xl">
            <UsersIcon size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-sans tracking-tight">System Users & Logins</h1>
            <p className="text-xs text-slate-500">Monitor registered consultants, credential details, and account creation dates</p>
          </div>
        </div>
        <button 
          onClick={fetchUsers}
          className="flex items-center space-x-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-brand-800 hover:border-brand-300 text-xs font-bold uppercase tracking-wider transition-all"
        >
          <RefreshCw size={13} className="text-slate-500" />
          <span>Refresh Database</span>
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-5 rounded-2xl text-sm leading-relaxed">
          {error}
        </div>
      ) : (
        <>
          {/* Metrics summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
              <div className="space-y-1.5">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Consultants</span>
                <span className="text-3xl font-extrabold text-slate-900 block">{usersList.length}</span>
              </div>
              <div className="p-4 bg-brand-50 border border-brand-100 text-brand-800 rounded-xl flex items-center justify-center shadow-inner">
                <UsersIcon size={24} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
              <div className="space-y-1.5">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Privileged Admins</span>
                <span className="text-3xl font-extrabold text-emerald-600 block">
                  {usersList.filter(u => u.email === 'admin@elitehire.com').length}
                </span>
              </div>
              <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shadow-inner">
                <KeyRound size={24} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
              <div className="space-y-1.5">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Latest Activation</span>
                <span className="text-sm font-semibold text-slate-700 block truncate">
                  {usersList.length > 0 ? new Date(usersList[0].createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl flex items-center justify-center shadow-inner">
                <Calendar size={24} />
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40">
              <h3 className="text-sm font-bold text-slate-900 font-sans tracking-wide">Registered Accounts Registry</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-150">
                    <th className="py-4 px-6 text-center w-16">#</th>
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Email Address</th>
                    <th className="py-4 px-6">Account ID</th>
                    <th className="py-4 px-6">Registered On</th>
                    <th className="py-4 px-6">Approval Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {usersList.map((usr, index) => (
                    <tr key={usr._id} className="hover:bg-slate-50/50 transition-colors text-slate-750">
                      <td className="py-4 px-6 text-center font-bold text-slate-400 text-xs">{index + 1}</td>
                      <td className="py-4 px-6 font-bold text-slate-900">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            usr.email === 'admin@elitehire.com' 
                              ? 'bg-brand-800 text-white shadow-sm' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {usr.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="block">{usr.name}</span>
                            {usr.email === 'admin@elitehire.com' && (
                              <span className="inline-block px-1.5 py-0.5 bg-brand-50 border border-brand-100 text-brand-800 text-[9px] font-bold rounded mt-0.5">
                                Master Admin
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-medium">
                        <div className="flex items-center space-x-2">
                          <Mail size={14} className="text-slate-400" />
                          <span>{usr.email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-slate-400">{usr._id}</td>
                      <td className="py-4 px-6 font-medium text-slate-500">
                        {new Date(usr.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-4 px-6">
                        {usr.email === 'admin@elitehire.com' ? (
                          <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                            Always Active
                          </span>
                        ) : usr.isApproved ? (
                          <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-750 text-xs font-semibold rounded-lg shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold rounded-lg shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
                            Pending Approval
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {usr.email === 'admin@elitehire.com' ? (
                          <span className="text-xs text-slate-400 font-medium italic">System Owner</span>
                        ) : (
                          <button
                            onClick={() => handleToggleApproval(usr._id, usr.isApproved)}
                            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                              usr.isApproved
                                ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300'
                                : 'bg-brand-50 border-brand-200 text-brand-800 hover:bg-brand-100 hover:border-brand-300'
                            }`}
                          >
                            {usr.isApproved ? (
                              <>
                                <UserX size={13} />
                                <span>Revoke Access</span>
                              </>
                            ) : (
                              <>
                                <UserCheck size={13} />
                                <span>Approve Login</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Users;
