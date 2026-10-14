import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Calendar, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';
import ThreeBarLogo from './ThreeBarLogo';

const Navbar = ({ onMenuClick }) => {
  const { user } = useAuth();
  const location = useLocation();

  const isAdmin = ['admin@elitehire.com', 'dev@elitehire.com'].includes(user?.email);

  // Map paths to beautiful titles
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Overview Dashboard';
    if (path === '/dashboard/naukri') return 'Naukri Integration';
    if (path === '/dashboard/indeed') return 'Indeed Integration';
    if (path === '/dashboard/analytics') return 'Analytics Info';
    if (path === '/dashboard/clients') return 'Data Received';
    if (path === '/dashboard/received-info') return 'Received Info';
    if (path === '/dashboard/users') return 'System Users';
    if (path === '/dashboard/payments') return 'Payments Info';
    if (path === '/dashboard/employees') return isAdmin ? 'Employees Info' : 'About';
    return 'Recruitix Platform';
  };

  const formatDate = () => {
    return formatDateDDMMYYYY(new Date());
  };

  return (
    <header className="bg-[#F4FBF8] border-b border-[#D8E9E2] px-6 py-3.5 flex items-center justify-between z-30 shadow-xs">
      {/* Left side: Mobile Toggle & Page title */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-[#526B70] hover:bg-[#D5F5E7] hover:text-[#07566A] transition-colors"
          aria-label="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-black text-[#07566A] font-sans tracking-tight">
              {getPageTitle()}
            </h2>
          </div>
          <p className="text-[11px] text-[#526B70] hidden sm:flex items-center space-x-1.5">
            <span>Recruitix Analytica Solution</span>
            <span className="text-[#00B96B] font-bold">•</span>
            <span className="text-[#00B96B] font-semibold">Data • Talent • Solutions</span>
          </p>
        </div>
      </div>

      {/* Right side: Actions, Date, User Info */}
      <div className="flex items-center space-x-4 sm:space-x-6">
        {/* Current Date Pill */}
        <div className="hidden md:flex items-center space-x-2 text-xs font-bold text-[#07566A] bg-white border border-[#D8E9E2] px-3.5 py-1.5 rounded-xl shadow-2xs">
          <Calendar size={13} className="text-[#00B96B]" />
          <span>{formatDate()}</span>
        </div>

        {/* User Profile Badge (Rightmost) */}
        <div className="flex items-center space-x-3 border-l border-[#D8E9E2] pl-4">
          <div className="hidden sm:block text-right">
            <span className="text-[10px] text-[#526B70] uppercase tracking-wider font-extrabold block">
              {isAdmin ? 'Admin Console' : 'Consultant Portal'}
            </span>
            <span className="text-xs font-bold text-[#07566A] block truncate max-w-[200px]" title={user?.email}>
              {user?.email}
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#D9FFF0] border border-[#00D98B]/30 flex items-center justify-center text-[#07566A] font-extrabold text-xs shadow-xs">
            <ShieldCheck size={16} className="text-[#00B96B]" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
