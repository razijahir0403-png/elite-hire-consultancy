import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Globe, BarChart3, TrendingUp, Users, CheckCircle, Clock, AlertTriangle, Activity, UserCheck, Inbox } from 'lucide-react';
import api from '../api';
import Spinner from '../components/Spinner';
import { RECRUITMENT_STATUS } from '../utils/statusMaster';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    analyticsCount: 0,
    clientsCount: 0,
    receivedInfoCount: 0,
    analyticsAgingAlertCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/dashboard/stats');
        if (data.success && data.data) {
          setStats(data.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const cardData = [
    {
      title: 'Open Naukri',
      description: 'Open the external Naukri job board in a new tab to manage campaigns and sourcing directly.',
      icon: Briefcase,
      color: 'from-blue-600/30 to-blue-500/5',
      borderColor: 'group-hover:border-blue-500/50',
      iconColor: 'text-blue-400',
      url: 'https://www.naukri.com',
    },
    {
      title: 'Open Indeed',
      description: 'Open the external Indeed job board in a new tab to review applications and resource profiles directly.',
      icon: Globe,
      color: 'from-emerald-600/30 to-emerald-500/5',
      borderColor: 'group-hover:border-emerald-500/50',
      iconColor: 'text-emerald-400',
      url: 'https://www.indeed.com',
    },
  ];

  if (loading) return <Spinner fullPage />;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-800/5 rounded-full blur-3xl" />
        <div className="space-y-2 z-10">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Welcome to Elite Hire Dashboard
          </h1>
          <p className="text-slate-500 text-sm max-w-xl">
            Monitor verification cycles, edit candidate logs, and trace recruitment audit histories across prime job boards.
          </p>
        </div>
       
      </div>

      {/* Mini Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Analytics Info', value: stats.analyticsCount, icon: Activity, color: 'text-brand-800 bg-brand-50 border-brand-100' },
          { label: 'Clients Info', value: stats.clientsCount, icon: UserCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { label: 'Received Info', value: stats.receivedInfoCount, icon: Inbox, color: 'text-amber-600 bg-amber-50 border-amber-100' },
          { label: 'Analytics Aging Alert', value: stats.analyticsAgingAlertCount, icon: AlertTriangle, color: 'text-red-600 bg-red-50 border-red-100' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl flex items-center justify-between border border-slate-200 shadow-sm">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">{stat.label}</span>
              <span className="text-2xl font-bold text-slate-900 block">{stat.value}</span>
            </div>
            <div className={`p-3 rounded-xl border flex items-center justify-center ${stat.color}`}>
              <stat.icon size={20} />
            </div>
          </div>
        ))}
      </div>

      {/* Portal Cards Grid */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-4 font-sans tracking-wide">
          Sourcing Channels & Operations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cardData.map((card, idx) => {
            const Icon = card.icon;
            // Map colors to crisp light designs
            const lightColor = idx === 0 
              ? 'bg-blue-50 border-blue-100 text-blue-800 hover:border-blue-300' 
              : idx === 1 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800 hover:border-emerald-300' 
              : 'bg-brand-50 border-brand-100 text-brand-800 hover:border-brand-300';
            
            return (
              <div
                key={idx}
                onClick={() => window.open(card.url, '_blank', 'noopener,noreferrer')}
                className={`group cursor-pointer bg-white p-6 rounded-2xl flex flex-col justify-between border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300`}
              >
                <div className="space-y-4">
                  {/* Icon badge */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${lightColor}`}>
                    <Icon size={24} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-base font-bold text-slate-900 group-hover:text-brand-800 transition-colors">
                      {card.title}
                    </h4>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex items-center text-xs font-bold text-brand-800 group-hover:text-brand-900 space-x-1">
                  <span>Open Website</span>
                  <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart removed */}
    </div>
  );
};

export default Dashboard;
