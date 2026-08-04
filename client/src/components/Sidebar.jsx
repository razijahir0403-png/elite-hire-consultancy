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
import Elitehirelogo from '../assets/Elitehirelogo.jpeg';
import Modal from './Modal';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { logout, endSession, user } = useAuth();
  const location = useLocation();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);

  const isAdmin = ['admin@elitehire.com', 'dev@elitehire.com'].includes(user?.email);

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
      name: 'Clients Info',
      path: '/dashboard/clients',
      icon: Building2
    },
    {
      name: 'Received Info',
      path: '/dashboard/received-info',
      icon: CheckSquare
    },
    ...(isAdmin ? [{
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
    }] : [])
  ];

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Main Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200/90 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex lg:flex-col lg:h-screen shadow-sm ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-50/40">
          <div className="flex items-center space-x-2.5">
            <div className="bg-white p-0.5 rounded-xl border border-slate-200 flex items-center justify-center w-10 h-10 shadow-sm overflow-hidden">
              <img src={Elitehirelogo} alt="Elite Hire Logo" className="w-full h-full object-cover rounded-lg" />
            </div>
            <div>
              <h1 className="text-md font-bold tracking-tight text-slate-900">
                Elite Hire
              </h1>
              <p className="text-[10px] text-brand-800 font-bold uppercase tracking-wider">
                Maintenance System
              </p>
            </div>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Info Profile section */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-800 flex items-center justify-center text-white font-semibold text-base shadow-glow-brand">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-semibold text-slate-850 truncate">{user?.name}</h4>
              <span className="text-xs text-slate-500 truncate block">Consultant</span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname === item.path;

            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) toggleSidebar();
                }}
                className={({ isActive }) =>
                  `flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 ${isActive
                    ? 'bg-brand-50 text-brand-800 border-l-4 border-brand-800 pl-3'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
                end={item.exact}
              >
                <Icon size={18} className={isActive ? 'text-brand-800' : 'text-slate-500'} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/40">
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center justify-center space-x-2.5 w-full px-4 py-3 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl border border-dashed border-red-200 transition-all duration-200"
          >
            <LogOut size={16} />
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
          <LogOut size={48} className="mx-auto text-brand-600 mb-4 opacity-80" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">Do you want to Logout completely or End this Session?</h3>
          <p className="text-sm text-slate-500 mb-6 px-4">
            If you <strong className="text-slate-700">End Session</strong>, you can login again today and continue working.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setIsLogoutModalOpen(false);
                endSession();
              }}
              className="w-full py-2.5 bg-white border border-brand-200 text-brand-700 hover:bg-brand-50 rounded-xl text-sm font-bold transition-all shadow-sm"
            >
              End Session
            </button>
            <button
              onClick={() => {
                setIsLogoutModalOpen(false);
                logout();
              }}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm shadow-red-200"
            >
              Logout completely
            </button>
            <button
              onClick={() => setIsLogoutModalOpen(false)}
              className="w-full py-2.5 bg-transparent text-slate-500 hover:text-slate-700 rounded-xl text-sm font-semibold transition-all mt-1"
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
