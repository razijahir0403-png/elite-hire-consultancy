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
      accent: 'hover:border-[#00D98B] hover:shadow-[0_14px_30px_-6px_rgba(0,217,139,0.2)]',
      iconBg: 'bg-[#D9FFF0] text-[#00B96B] border-[#00D98B]/30',
      url: 'https://www.naukri.com',
    },
    {
      title: 'Indeed Sourcing Channel',
      description: 'Review active job listings, direct applicant submissions, and sourcing profiles on Indeed.',
      icon: Globe,
      topGradient: 'from-[#38BDF8] to-[#07566A]',
      accent: 'hover:border-[#38BDF8] hover:shadow-[0_14px_30px_-6px_rgba(56,189,248,0.2)]',
      iconBg: 'bg-[#F0F9FF] text-[#0284C7] border-[#38BDF8]/30',
      url: 'https://www.indeed.com',
    },
  ];

  if (loading) return <Spinner fullPage />;

  return (
    <div className="space-y-8 animate-fade-in-up selection:bg-[#D5F5E7] selection:text-[#07566A]">
      {/* Welcome Banner with Mint Gradient & Three Ascending Bars Branding */}
      <div className="relative bg-white rounded-3xl border border-[#D8E9E2] p-6 sm:p-8 overflow-hidden shadow-sm">
        {/* Subtle mint ambient mesh behind the banner */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#D5F5E7]/90 via-[#EAF8F3]/50 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-10 opacity-15 pointer-events-none hidden lg:block">
          <ThreeBarLogo size="xl" animated={false} />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#D5F5E7] border border-[#00B96B]/30 text-[11px] font-extrabold text-[#07566A] uppercase tracking-wider">
              <Sparkles size={13} className="text-[#00B96B]" />
              <span>Enterprise Analytics Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#07566A]">
              Recruitix Analytica Solution
            </h1>
            <p className="text-xs sm:text-sm text-[#526B70] leading-relaxed">
              Real-time sourcing pipeline intelligence, recruitment audits, candidate verifications, and attendance tracking records.
            </p>
          </div>

          <div className="flex items-center space-x-3 self-start lg:self-center">
            <div className="bg-white p-2.5 rounded-2xl border border-[#D8E9E2] shadow-sm flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-[#D5F5E7] text-[#00B96B]">
                <Calendar size={18} />
              </div>
              <div className="pr-2">
                <span className="text-[10px] text-[#526B70] uppercase tracking-wider font-extrabold block">Today</span>
                <span className="text-xs font-bold text-[#07566A]">{formatDateDDMMYYYY(new Date())}</span>
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
            iconStyle: 'text-[#00B96B] bg-[#D9FFF0] border-[#00D98B]/30',
            badgeStyle: 'bg-[#D9FFF0] text-[#07566A] border-[#00D98B]/20',
            hoverStyle: 'hover:border-[#00D98B]/60 hover:shadow-[0_14px_30px_-6px_rgba(0,217,139,0.2)]',
          },
          {
            label: 'Data Received',
            value: stats.clientsCount,
            icon: UserCheck,
            badge: 'Candidate Leads',
            link: '/dashboard/clients',
            topGradient: 'from-[#38BDF8] to-[#0284C7]',
            iconStyle: 'text-[#0284C7] bg-[#F0F9FF] border-[#38BDF8]/30',
            badgeStyle: 'bg-[#F0F9FF] text-[#0369A1] border-[#38BDF8]/20',
            hoverStyle: 'hover:border-[#38BDF8]/60 hover:shadow-[0_14px_30px_-6px_rgba(56,189,248,0.2)]',
          },
          {
            label: 'Received Info',
            value: stats.receivedInfoCount,
            icon: Inbox,
            badge: 'Verified Intake',
            link: '/dashboard/received-info',
            topGradient: 'from-[#A78BFA] to-[#7C3AED]',
            iconStyle: 'text-[#7C3AED] bg-[#F5F3FF] border-[#8B5CF6]/30',
            badgeStyle: 'bg-[#F5F3FF] text-[#6D28D9] border-[#8B5CF6]/20',
            hoverStyle: 'hover:border-[#8B5CF6]/60 hover:shadow-[0_14px_30px_-6px_rgba(139,92,246,0.2)]',
          },
          {
            label: 'Analytics Aging Alert',
            value: stats.analyticsAgingAlertCount,
            icon: AlertTriangle,
            badge: '> 25 Days',
            link: '/dashboard/analytics',
            topGradient: 'from-[#FBBF24] to-[#FB7185]',
            iconStyle: 'text-[#D97706] bg-[#FFFBEB] border-[#FBBF24]/40',
            badgeStyle: 'bg-[#FFF1F2] text-[#BE123C] border-[#FB7185]/30',
            hoverStyle: 'hover:border-[#FB7185]/60 hover:shadow-[0_14px_30px_-6px_rgba(251,113,133,0.2)]',
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            onClick={() => navigate(stat.link)}
            className={`group cursor-pointer bg-white rounded-2xl border border-[#D8E9E2] ${stat.hoverStyle} hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs`}
          >
            {/* Top Accent Gradient Line */}
            <div className={`h-1.5 w-full bg-gradient-to-r ${stat.topGradient}`} />

            <div className="p-5 flex flex-col justify-between flex-1">
              <div className="flex items-start justify-between">
                <span className="text-xs text-[#526B70] font-bold uppercase tracking-wider block">
                  {stat.label}
                </span>
                <div className={`p-2.5 rounded-xl border flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-xs ${stat.iconStyle}`}>
                  <stat.icon size={18} />
                </div>
              </div>

              <div className="mt-5 flex items-baseline justify-between">
                <span className="text-3xl font-black text-[#07566A] tracking-tight block">
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
            <h3 className="text-base font-extrabold text-[#07566A] font-sans">
              External Sourcing Portals
            </h3>
            <p className="text-xs text-[#526B70]">
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
                className={`group cursor-pointer bg-white rounded-3xl border border-[#D8E9E2] ${card.accent} hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs`}
              >
                {/* Top Accent Gradient Bar */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${card.topGradient}`} />

                <div className="p-6 flex flex-col justify-between flex-1">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs group-hover:scale-105 transition-transform duration-300 ${card.iconBg}`}>
                        <Icon size={24} />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#EAF8F3] text-[#526B70] border border-[#D8E9E2]">
                        External Portal
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-base font-extrabold text-[#07566A] group-hover:text-[#00B96B] transition-colors">
                        {card.title}
                      </h4>
                      <p className="text-xs text-[#526B70] leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#D8E9E2] flex items-center text-xs font-bold text-[#07566A] group-hover:text-[#00B96B] space-x-1.5 transition-colors">
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
