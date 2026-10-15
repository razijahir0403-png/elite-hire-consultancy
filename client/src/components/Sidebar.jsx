import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard,
  BarChart3,
  Building2,
  CheckSquare,
  LogOut,
  X,
  Users as UsersIcon,
  DollarSign,
  Briefcase
} from 'lucide-react';
import rasLogo from '../assets/ras.jpeg';
import Modal from './Modal';
import ThreeBarLogo from './ThreeBarLogo';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { logout, endSession, user, isAdmin } = useAuth();
  const location = useLocation();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);

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

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#043845]/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={toggleSidebar}
        />
      )}

      {/* Main Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#F4FBF8] border-r border-[#D8E9E2] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex lg:flex-col lg:h-screen shadow-sm ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header with Recruitix Analytica Solution Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D8E9E2] bg-[#F4FBF8]">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="bg-white p-1 rounded-xl border border-[#D8E9E2] flex items-center justify-center w-11 h-11 shadow-sm overflow-hidden flex-shrink-0 group">
              <img src={rasLogo} alt="Recruitix Analytica Solution Logo" className="w-full h-full object-contain" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-sm font-black tracking-tight text-[#07566A] truncate">
                Recruitix
              </h1>
              <p className="text-[11px] font-bold text-[#07566A]/85 -mt-0.5 truncate">
                Analytica Solution
              </p>
              <p className="text-[8px] text-[#00B96B] font-extrabold uppercase tracking-widest truncate">
                Data • Talent • Solutions
              </p>
            </div>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-1.5 rounded-xl text-[#526B70] hover:bg-[#D5F5E7] hover:text-[#07566A] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Info Profile section */}
        <div className="px-5 py-3.5 border-b border-[#D8E9E2] bg-[#EAF8F3]/60">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#07566A] to-[#043845] flex items-center justify-center text-white font-extrabold text-sm shadow-[0_2px_8px_rgba(7,86,106,0.25)] border border-white">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#00B96B] border-2 border-white rounded-full shadow-xs" title="Online" />
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-[#07566A] truncate">{user?.name}</h4>
              <span className="text-[11px] text-[#526B70] truncate block">
                {isAdmin ? 'System Administrator' : 'Employee Portal'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3.5 py-4 space-y-1 overflow-y-auto">
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
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 group ${
                    isActive
                      ? 'bg-[#D5F5E7] text-[#07566A] border-l-4 border-[#00B96B] shadow-xs'
                      : 'text-[#526B70] hover:bg-[#D5F5E7]/70 hover:text-[#07566A]'
                  }`
                }
                end={item.exact}
              >
                <Icon
                  size={17}
                  className={`transition-colors ${
                    isActive ? 'text-[#00B96B]' : 'text-[#526B70] group-hover:text-[#07566A]'
                  }`}
                />
                <span className="truncate">{item.name}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00B96B]" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Brand Mini Animated Mascot Footer */}
        <div className="px-5 py-3 border-t border-[#D8E9E2] bg-[#F4FBF8] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ThreeBarLogo size="xs" animated={true} />
            <span className="text-[10px] font-extrabold text-[#07566A] tracking-wider uppercase">
              Recruitix SaaS
            </span>
          </div>
          <span className="w-2 h-2 rounded-full bg-[#00B96B] animate-ping" />
        </div>

        {/* Footer actions */}
        <div className="p-3.5 border-t border-[#D8E9E2] bg-[#F4FBF8]">
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center justify-center space-x-2 w-full px-3.5 py-2.5 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl border border-dashed border-red-200 transition-all duration-200"
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
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-3 shadow-xs">
            <LogOut size={28} />
          </div>
          <h3 className="text-base font-extrabold text-[#07566A] mb-2">
            Do you want to Logout completely or End this Session?
          </h3>
          <p className="text-xs text-[#526B70] mb-6 px-4 leading-relaxed">
            If you <strong className="text-[#07566A]">End Session</strong>, your attendance session is closed and you can log in again later today.
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => {
                setIsLogoutModalOpen(false);
                endSession();
              }}
              className="w-full py-2.5 bg-gradient-to-r from-[#00D98B] to-[#00B96B] hover:from-[#00E99A] hover:to-[#00D98B] text-[#07566A] rounded-xl text-xs font-extrabold transition-all shadow-[0_4px_14px_rgba(0,217,139,0.3)] active:scale-[0.98]"
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
              className="w-full py-2 text-[#526B70] hover:text-[#07566A] rounded-xl text-xs font-bold transition-all"
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
