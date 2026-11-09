import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Calendar, ShieldCheck, UserRound, Sun, Moon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

const Navbar = ({ onMenuClick }) => {
  const { user, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isAboutActive = location.pathname === '/dashboard/employees';

  // Map paths to beautiful titles
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Overview Dashboard';
    if (path === '/dashboard/naukri') return 'Naukri Integration';
    if (path === '/dashboard/indeed') return 'Indeed Integration';
    if (path.includes('audit-trails') || path.includes('sourcing-audit-trails')) return 'Sourcing Audit Trails';
    if (path === '/dashboard/analytics') return 'Analytics Info';
    if (path === '/dashboard/clients') return 'Data Received';
    if (path === '/dashboard/received-info') return 'Received Info';
    if (path === '/dashboard/users') return 'System Users';
    if (path === '/dashboard/payments') return 'Payments Info';
    if (path === '/dashboard/employees') return isAdmin ? 'Employees Info' : 'About';
    if (path === '/dashboard/chat') return 'Internal Team Chat';
    return 'Eleventis Platform';
  };

  const formatDate = () => {
    return formatDateDDMMYYYY(new Date());
  };

  return (
    <header className="bg-white dark:bg-[#1E293B] border-b border-[#B8C0CC] dark:border-[#475569] px-4 sm:px-6 py-3.5 flex items-center justify-between z-30 shadow-xs transition-colors duration-200">
      {/* Left side: Mobile Toggle & Page title */}
      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-[#374151] dark:text-[#E2E8F0] hover:bg-[#F8FAFC] dark:hover:bg-[#26354A] hover:text-[#111827] dark:hover:text-[#F8FAFC] border border-transparent hover:border-[#B8C0CC] dark:hover:border-[#475569] transition-all flex-shrink-0"
          aria-label="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <h2 className="text-base sm:text-lg font-black text-[#111827] dark:text-[#FFFFFF] font-sans tracking-tight truncate">
              {getPageTitle()}
            </h2>
          </div>
          <p className="text-[11px] text-[#374151] dark:text-[#E2E8F0] hidden sm:flex items-center space-x-1.5 truncate font-medium">
            <span>Eleventis</span>
            <span className="text-[#00B96B] font-bold">•</span>
            <span className="text-[#00B96B] font-semibold">Data • Talent • Solutions</span>
          </p>
        </div>
      </div>

      {/* Right side: Theme Toggle, Date, User Info */}
      <div className="flex items-center space-x-2.5 sm:space-x-4 lg:space-x-6 flex-shrink-0">
        {/* Light/Dark Theme Toggle */}
        <div
          className="flex items-center p-1 bg-[#F8FAFC] dark:bg-[#121212] border border-[#B8C0CC] dark:border-[#475569] rounded-xl shadow-2xs transition-colors duration-200"
          role="group"
          aria-label="Theme Selection"
        >
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center space-x-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer ${
              theme === 'light'
                ? 'bg-white text-[#111827] border border-[#B8C0CC] shadow-xs'
                : 'text-[#374151] dark:text-[#E2E8F0] hover:text-[#111827] dark:hover:text-[#FFFFFF] hover:bg-white/60 dark:hover:bg-[#1E293B]'
            }`}
            title="Light Theme ☀️"
            aria-pressed={theme === 'light'}
          >
            <Sun
              size={13}
              className={`transition-transform duration-200 ${
                theme === 'light' ? 'text-amber-500 fill-amber-500' : 'text-[#374151] dark:text-[#E2E8F0]'
              }`}
            />
            <span className="hidden sm:inline">Light ☀️</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center space-x-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer ${
              theme === 'dark'
                ? 'bg-[#1E293B] text-emerald-300 border border-[#475569] shadow-xs'
                : 'text-[#374151] dark:text-[#E2E8F0] hover:text-[#111827] dark:hover:text-[#FFFFFF] hover:bg-white/60 dark:hover:bg-[#1E293B]'
            }`}
            title="Dark Theme 🌙"
            aria-pressed={theme === 'dark'}
          >
            <Moon
              size={13}
              className={`transition-transform duration-200 ${
                theme === 'dark' ? 'text-emerald-400 fill-emerald-400' : 'text-[#374151] dark:text-[#E2E8F0]'
              }`}
            />
            <span className="hidden sm:inline">Dark 🌙</span>
          </button>
        </div>

        {/* Current Date Pill */}
        <div className="hidden md:flex items-center space-x-2 text-xs font-bold text-[#111827] dark:text-[#F8FAFC] bg-white dark:bg-[#121212] border border-[#B8C0CC] dark:border-[#475569] px-3.5 py-1.5 rounded-xl shadow-2xs transition-colors duration-200">
          <Calendar size={13} className="text-[#00B96B]" />
          <span>{formatDate()}</span>
        </div>

        {/* User Profile Badge (Rightmost) */}
        <div className="flex items-center space-x-2 sm:space-x-3 border-l border-[#B8C0CC] dark:border-[#475569] pl-2.5 sm:pl-4 transition-colors duration-200">
          <div className="flex flex-col items-end text-right">
            <div className="hidden sm:block">
              <span className="text-[10px] text-[#374151] dark:text-[#E2E8F0] uppercase tracking-wider font-extrabold block">
                {isAdmin ? 'Admin Portal' : 'Employee Portal'}
              </span>
              <span className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC] block truncate max-w-[180px] lg:max-w-[220px]" title={user?.email}>
                {user?.email}
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/employees')}
              className={`inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 sm:mt-1.5 rounded-lg text-xs font-bold transition-all duration-200 border group ${
                isAboutActive
                  ? 'bg-[#D5F5E7] dark:bg-[#0E3D48] text-[#07566A] dark:text-emerald-300 border-[#00B96B] shadow-2xs'
                  : 'bg-white dark:bg-[#121212] text-[#374151] dark:text-[#E2E8F0] border-[#B8C0CC] dark:border-[#475569] hover:bg-[#F8FAFC] dark:hover:bg-[#26354A] hover:text-[#111827] dark:hover:text-[#FFFFFF] hover:border-[#00B96B]/50'
              }`}
              title="Profile"
              aria-label="Profile"
            >
              <UserRound
                size={13}
                className={`transition-colors ${
                  isAboutActive ? 'text-[#00B96B]' : 'text-[#374151] dark:text-[#E2E8F0] group-hover:text-[#00B96B]'
                }`}
              />
              <span>Profile</span>
            </button>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#D9FFF0] dark:bg-[#0E3D48] border border-[#00D98B]/40 dark:border-[#00D98B]/50 flex items-center justify-center text-[#07566A] dark:text-emerald-300 font-extrabold text-xs shadow-xs flex-shrink-0">
            <ShieldCheck size={16} className="text-[#00B96B]" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
