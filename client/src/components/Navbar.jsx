import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Bell, Search, Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const Navbar = ({ onMenuClick }) => {
  const { user } = useAuth();
  const location = useLocation();

  // Map paths to beautiful titles
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Overview Dashboard';
    if (path === '/dashboard/naukri') return 'Naukri Integration';
    if (path === '/dashboard/indeed') return 'Indeed Integration';
    if (path === '/dashboard/analytics') return 'Analytics Info';
    if (path === '/dashboard/users') return 'System Users';
    return 'Consultancy System';
  };

  const formatDate = () => {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-30 shadow-sm">
      {/* Left side: Mobile Toggle & Page title */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          aria-label="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans tracking-wide">
            {getPageTitle()}
          </h2>
          <p className="text-xs text-slate-500 hidden sm:block">
            Elite Hire Recruitment & Talent Sourcing Platform
          </p>
        </div>
      </div>

      {/* Right side: Actions, Date, User Info */}
      <div className="flex items-center space-x-6">
        {/* Current Date */}
        <div className="hidden md:flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl">
          <Calendar size={13} className="text-brand-800" />
          <span>{formatDate()}</span>
        </div>

        {/* Notifications mock icon */}
        <button className="relative p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-350 transition-all">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-800 rounded-full ring-2 ring-white" />
        </button>

        {/* User Profile Badge (Rightmost) */}
        <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
          <div className="hidden sm:block text-right">
            <span className="text-xs text-slate-400 block">Logged in as</span>
            <span className="text-xs font-semibold text-slate-700 block">{user?.email}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
