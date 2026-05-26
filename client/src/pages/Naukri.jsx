import React, { useEffect, useState } from 'react';
import { Briefcase, ExternalLink, RefreshCw } from 'lucide-react';
import api from '../api';
import { normalizeContactNumber } from '../utils/contactNumber';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';

const Naukri = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNaukriCandidates = async () => {
    setLoading(true);
    try {
      // Fetch records (limit 100 to filter client-side)
      const { data } = await api.get('/analytics?limit=100');
      const records = data.records || [];
      // Filter records that belong to Naukri (link contains 'naukri')
      const filtered = records.filter(r => 
        r.portalLink && r.portalLink.toLowerCase().includes('naukri')
      );
      setCandidates(filtered);
    } catch (error) {
      console.error('Error fetching Naukri candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNaukriCandidates();
  }, []);

  if (loading) return <Spinner fullPage />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-brand-50 border border-brand-100 text-brand-800 rounded-xl">
            <Briefcase size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-sans tracking-tight">Naukri Sourcing Channel</h1>
            <p className="text-xs text-slate-500">Manage, trace, and audit candidates sourced through the Naukri portal</p>
          </div>
        </div>
        <button 
          onClick={fetchNaukriCandidates}
          className="flex items-center space-x-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-brand-800 hover:border-brand-300 text-xs font-bold uppercase tracking-wider transition-all"
        >
          <RefreshCw size={13} className="text-slate-500" />
          <span>Sync Pipeline</span>
        </button>
      </div>

      {/* Grid List */}
      {candidates.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-sm">
          <p className="text-slate-500 text-sm">No active candidates are currently tagged to Naukri portal links.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {candidates.map((c) => (
            <div key={c._id} className="glass-card p-6 rounded-2xl border border-slate-200/90 flex flex-col justify-between space-y-5 bg-white shadow-sm">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-brand-800 font-extrabold uppercase tracking-wider block">ID: {c.idnumber}</span>
                    <h3 className="text-base font-bold text-slate-900 mt-1.5">{c.domain}</h3>
                  </div>
                  <StatusBadge status={c.status} type="recruitment" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-slate-450 block font-medium">Resource Person</span>
                    <span className="text-slate-700 font-semibold">{c.resourcePerson}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block font-medium">Company</span>
                    <span className="text-slate-700 font-semibold">{c.companyName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block font-medium">Location</span>
                    <span className="text-slate-700 font-semibold">{c.location}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block font-medium">Contact</span>
                    <span className="text-slate-700 font-semibold truncate block">
                      {normalizeContactNumber(c.contactNumber) || '—'}
                    </span>
                  </div>
                </div>

                {c.description && (
                  <p className="text-xs text-slate-655 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    {c.description}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-3 pt-3.5 border-t border-slate-100">
                {c.portalLink && (
                  <a
                    href={c.portalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center space-x-2 px-3.5 py-2 bg-brand-50 border border-brand-100 text-brand-800 hover:bg-brand-800 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <span>Visit Naukri Listing</span>
                    <ExternalLink size={12} />
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

export default Naukri;
