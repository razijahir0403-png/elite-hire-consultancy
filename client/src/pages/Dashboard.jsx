import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Globe,
  Activity,
  UserCheck,
  Inbox,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Sparkles
} from 'lucide-react';
import api from '../api';
import Spinner from '../components/Spinner';
import ThreeBarLogo from '../components/ThreeBarLogo';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

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
      title: 'Naukri Sourcing Channel',
      description: 'Manage candidate applications, sourcing pipelines, and resume audits on Naukri portal.',
      icon: Briefcase,
      topGradient: 'from-[#00E99A] to-[#00B96B]',
      accent: 'hover:border-[#00D98B] hover:shadow-[0_14px_30px_-6px_rgba(0,217,139,0.2)] dark:hover:shadow-[0_14px_30px_-6px_rgba(0,217,139,0.3)]',
      iconBg: 'bg-[#D9FFF0] dark:bg-[#0E3D48] text-[#00B96B] dark:text-emerald-400 border-[#00D98B]/30 dark:border-[#00D98B]/40',
      url: 'https://www.naukri.com',
    },
    {
      title: 'Indeed Sourcing Channel',
      description: 'Review active job listings, direct applicant submissions, and sourcing profiles on Indeed.',
      icon: Globe,
      topGradient: 'from-[#38BDF8] to-[#07566A]',
      accent: 'hover:border-[#38BDF8] hover:shadow-[0_14px_30px_-6px_rgba(56,189,248,0.2)] dark:hover:shadow-[0_14px_30px_-6px_rgba(56,189,248,0.3)]',
      iconBg: 'bg-[#F0F9FF] dark:bg-sky-950/50 text-[#0284C7] dark:text-sky-400 border-[#38BDF8]/30 dark:border-[#38BDF8]/40',
      url: 'https://www.indeed.com',
    },
  ];

  if (loading) return <Spinner fullPage />;

  return (
    <div className="space-y-8 animate-fade-in-up selection:bg-[#D5F5E7] dark:selection:bg-[#00B96B] selection:text-[#07566A] dark:selection:text-white">
      {/* Welcome Banner with Mint Gradient & Three Ascending Bars Branding */}
      <div className="relative bg-white dark:bg-[#16202E] rounded-3xl border border-[#D8E9E2] dark:border-[#273548] p-6 sm:p-8 overflow-hidden shadow-sm transition-colors duration-200">
        {/* Subtle mint ambient mesh behind the banner */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#D5F5E7]/90 dark:from-[#0E3D48]/40 via-[#EAF8F3]/50 dark:via-[#16202E]/20 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-10 opacity-15 dark:opacity-10 pointer-events-none hidden lg:block">
          <ThreeBarLogo size="xl" animated={false} />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#D5F5E7] dark:bg-[#0E3D48] border border-[#00B96B]/30 dark:border-[#00B96B]/50 text-[11px] font-extrabold text-[#07566A] dark:text-emerald-300 uppercase tracking-wider">
              <Sparkles size={13} className="text-[#00B96B] dark:text-emerald-400" />
              <span>Enterprise Analytics Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#07566A] dark:text-white">
              Eleventis
            </h1>
            <p className="text-xs sm:text-sm text-[#526B70] dark:text-slate-400 leading-relaxed">
              Real-time sourcing pipeline intelligence, recruitment audits, candidate verifications, and attendance tracking records.
            </p>
          </div>

          <div className="flex items-center space-x-3 self-start lg:self-center">
            <div className="bg-white dark:bg-[#131C28] p-2.5 rounded-2xl border border-[#D8E9E2] dark:border-[#273548] shadow-sm flex items-center space-x-3 transition-colors duration-200">
              <div className="p-2 rounded-xl bg-[#D5F5E7] dark:bg-[#0E3D48] text-[#00B96B] dark:text-emerald-400">
                <Calendar size={18} />
              </div>
              <div className="pr-2">
                <span className="text-[10px] text-[#526B70] dark:text-slate-400 uppercase tracking-wider font-extrabold block">Today</span>
                <span className="text-xs font-bold text-[#07566A] dark:text-slate-200">{formatDateDDMMYYYY(new Date())}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid with Distinct Accent Colorways and Top Gradient Bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: 'Analytics Info',
            value: stats.analyticsCount,
            icon: Activity,
            badge: 'Active Records',
            link: '/dashboard/analytics',
            topGradient: 'from-[#00E99A] to-[#00B96B]',
            iconStyle: 'text-[#00B96B] dark:text-emerald-400 bg-[#D9FFF0] dark:bg-[#0E3D48] border-[#00D98B]/30 dark:border-[#00D98B]/40',
            badgeStyle: 'bg-[#D9FFF0] dark:bg-[#0E3D48] text-[#07566A] dark:text-emerald-300 border-[#00D98B]/20 dark:border-[#00D98B]/40',
            hoverStyle: 'hover:border-[#00D98B]/60 hover:shadow-[0_14px_30px_-6px_rgba(0,217,139,0.2)] dark:hover:shadow-[0_14px_30px_-6px_rgba(0,217,139,0.3)]',
          },
          {
            label: 'Data Received',
            value: stats.clientsCount,
            icon: UserCheck,
            badge: 'Candidate Leads',
            link: '/dashboard/clients',
            topGradient: 'from-[#38BDF8] to-[#0284C7]',
            iconStyle: 'text-[#0284C7] dark:text-sky-400 bg-[#F0F9FF] dark:bg-sky-950/40 border-[#38BDF8]/30 dark:border-[#38BDF8]/40',
            badgeStyle: 'bg-[#F0F9FF] dark:bg-sky-950/40 text-[#0369A1] dark:text-sky-300 border-[#38BDF8]/20 dark:border-[#38BDF8]/40',
            hoverStyle: 'hover:border-[#38BDF8]/60 hover:shadow-[0_14px_30px_-6px_rgba(56,189,248,0.2)] dark:hover:shadow-[0_14px_30px_-6px_rgba(56,189,248,0.3)]',
          },
          {
            label: 'Received Info',
            value: stats.receivedInfoCount,
            icon: Inbox,
            badge: 'Verified Intake',
            link: '/dashboard/received-info',
            topGradient: 'from-[#A78BFA] to-[#7C3AED]',
            iconStyle: 'text-[#7C3AED] dark:text-purple-400 bg-[#F5F3FF] dark:bg-purple-950/40 border-[#8B5CF6]/30 dark:border-[#8B5CF6]/40',
            badgeStyle: 'bg-[#F5F3FF] dark:bg-purple-950/40 text-[#6D28D9] dark:text-purple-300 border-[#8B5CF6]/20 dark:border-[#8B5CF6]/40',
            hoverStyle: 'hover:border-[#8B5CF6]/60 hover:shadow-[0_14px_30px_-6px_rgba(139,92,246,0.2)] dark:hover:shadow-[0_14px_30px_-6px_rgba(139,92,246,0.3)]',
          },
          {
            label: 'Analytics Aging Alert',
            value: stats.analyticsAgingAlertCount,
            icon: AlertTriangle,
            badge: '> 25 Days',
            link: '/dashboard/analytics',
            topGradient: 'from-[#FBBF24] to-[#FB7185]',
            iconStyle: 'text-[#D97706] dark:text-amber-400 bg-[#FFFBEB] dark:bg-amber-950/40 border-[#FBBF24]/40 dark:border-[#FBBF24]/40',
            badgeStyle: 'bg-[#FFF1F2] dark:bg-rose-950/40 text-[#BE123C] dark:text-rose-300 border-[#FB7185]/30 dark:border-[#FB7185]/40',
            hoverStyle: 'hover:border-[#FB7185]/60 hover:shadow-[0_14px_30px_-6px_rgba(251,113,133,0.2)] dark:hover:shadow-[0_14px_30px_-6px_rgba(251,113,133,0.3)]',
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            onClick={() => navigate(stat.link)}
            className={`group cursor-pointer bg-white dark:bg-[#16202E] rounded-2xl border border-[#D8E9E2] dark:border-[#273548] ${stat.hoverStyle} hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs`}
          >
            {/* Top Accent Gradient Line */}
            <div className={`h-1.5 w-full bg-gradient-to-r ${stat.topGradient}`} />

            <div className="p-5 flex flex-col justify-between flex-1">
              <div className="flex items-start justify-between">
                <span className="text-xs text-[#526B70] dark:text-slate-400 font-bold uppercase tracking-wider block">
                  {stat.label}
                </span>
                <div className={`p-2.5 rounded-xl border flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-xs ${stat.iconStyle}`}>
                  <stat.icon size={18} />
                </div>
              </div>

              <div className="mt-5 flex items-baseline justify-between">
                <span className="text-3xl font-black text-[#07566A] dark:text-white tracking-tight block">
                  {stat.value}
                </span>
                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md border ${stat.badgeStyle}`}>
                  {stat.badge}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sourcing Channels & Operations Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-extrabold text-[#07566A] dark:text-white font-sans">
              External Sourcing Portals
            </h3>
            <p className="text-xs text-[#526B70] dark:text-slate-400">
              Direct access to connected talent sourcing channels
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cardData.map((card, idx) => {
            const Icon = card.icon;

            return (
              <div
                key={idx}
                onClick={() => window.open(card.url, '_blank', 'noopener,noreferrer')}
                className={`group cursor-pointer bg-white dark:bg-[#16202E] rounded-3xl border border-[#D8E9E2] dark:border-[#273548] ${card.accent} hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs`}
              >
                {/* Top Accent Gradient Bar */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${card.topGradient}`} />

                <div className="p-6 flex flex-col justify-between flex-1">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs group-hover:scale-105 transition-transform duration-300 ${card.iconBg}`}>
                        <Icon size={24} />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#EAF8F3] dark:bg-[#1A2636] text-[#526B70] dark:text-slate-300 border border-[#D8E9E2] dark:border-[#273548]">
                        External Portal
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-base font-extrabold text-[#07566A] dark:text-white group-hover:text-[#00B96B] dark:group-hover:text-[#00D98B] transition-colors">
                        {card.title}
                      </h4>
                      <p className="text-xs text-[#526B70] dark:text-slate-400 leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#D8E9E2] dark:border-[#273548] flex items-center text-xs font-bold text-[#07566A] dark:text-slate-200 group-hover:text-[#00B96B] dark:group-hover:text-[#00D98B] space-x-1.5 transition-colors">
                    <span>Open Sourcing Portal</span>
                    <ArrowRight size={14} className="transform group-hover:translate-x-1.5 transition-transform duration-200" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;