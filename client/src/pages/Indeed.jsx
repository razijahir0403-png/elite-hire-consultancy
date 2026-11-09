import React, { useEffect, useState } from 'react';
import { Globe, ExternalLink, RefreshCw } from 'lucide-react';
import api from '../api';
import { normalizeContactNumber } from '../utils/contactNumber';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';

const Indeed = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchIndeedCandidates = async () => {
    setLoading(true);
    try {
      // Fetch records (limit 100 to filter client-side)
      const { data } = await api.get('/analytics?limit=100');
      const records = data.records || [];
      // Filter records that belong to Indeed (link contains 'indeed')
      const filtered = records.filter(r => 
        r.portalLink && r.portalLink.toLowerCase().includes('indeed')
      );
      setCandidates(filtered);
    } catch (error) {
      console.error('Error fetching Indeed candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndeedCandidates();
  }, []);

  if (loading) return <Spinner fullPage />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#16202E] p-6 rounded-2xl border border-slate-200 dark:border-[#273548] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm transition-colors duration-200">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 rounded-xl">
            <Globe size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white font-sans tracking-tight">Indeed Sourcing Channel</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage, trace, and audit candidates sourced through the Indeed platform</p>
          </div>
        </div>
        <button 
          onClick={fetchIndeedCandidates}
          className="flex items-center space-x-2 px-4 py-2.5 bg-slate-50 dark:bg-[#1A2636] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:text-brand-800 dark:hover:text-emerald-300 hover:border-brand-300 dark:hover:border-emerald-500/50 text-xs font-bold uppercase tracking-wider transition-all"
        >
          <RefreshCw size={13} className="text-slate-500 dark:text-slate-400" />
          <span>Sync Pipeline</span>
        </button>
      </div>

      {/* Grid List */}
      {candidates.length === 0 ? (
        <div className="bg-white dark:bg-[#16202E] p-12 rounded-2xl border border-slate-200 dark:border-[#273548] text-center shadow-sm transition-colors duration-200">
          <p className="text-slate-500 dark:text-slate-400 text-sm">No active candidates are currently tagged to Indeed portal links.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {candidates.map((c) => (
            <div key={c._id} className="glass-card p-6 rounded-2xl border border-slate-200/90 dark:border-[#273548] flex flex-col justify-between space-y-5 bg-white dark:bg-[#16202E] shadow-sm transition-colors duration-200">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-brand-800 dark:text-emerald-400 font-extrabold uppercase tracking-wider block">ID: {c.idnumber}</span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">{c.domain}</h3>
                  </div>
                  <StatusBadge status={c.status} type="recruitment" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-100 dark:border-[#273548]">
                  <div>
                    <span className="text-slate-450 dark:text-slate-400 block font-medium">Resource Person</span>
                    <span className="text-slate-700 dark:text-slate-200 font-semibold">{c.resourcePerson || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 dark:text-slate-400 block font-medium">Email</span>
                    <span className="text-slate-700 dark:text-slate-200 font-semibold break-all block">
                      {c.email || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-450 dark:text-slate-400 block font-medium">Company</span>
                    <span className="text-slate-700 dark:text-slate-200 font-semibold">{c.companyName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 dark:text-slate-400 block font-medium">Location</span>
                    <span className="text-slate-700 dark:text-slate-200 font-semibold">{c.location}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 dark:text-slate-400 block font-medium">Contact</span>
                    <span className="text-slate-700 dark:text-slate-200 font-semibold break-words block">
                      {normalizeContactNumber(c.contactNumber) || '—'}
                    </span>
                  </div>
                </div>

                {c.description && (
                  <p className="text-xs text-slate-655 dark:text-slate-300 leading-relaxed bg-slate-50/70 dark:bg-[#1A2636] p-3 rounded-xl border border-slate-100 dark:border-[#273548]">
                    {c.description}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-3 pt-3.5 border-t border-slate-100 dark:border-[#273548]">
                {c.portalLink && (
                  <a
                    href={c.portalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-gradient-to-r from-[#00D98B] to-[#00B96B] hover:from-[#00E99A] hover:to-[#00D98B] text-[#07566A] dark:text-[#043845] rounded-xl text-xs font-extrabold transition-all shadow-[0_4px_12px_rgba(0,217,139,0.25)] active:scale-[0.98]"
                  >
                    <span>Visit Indeed Listing</span>
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Indeed;
