import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#121212] text-[#1F2937] dark:text-[#F1F5F9] font-sans antialiased transition-colors duration-200">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-col flex-1 h-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#121212] transition-colors duration-200">
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8 min-w-0 w-full bg-[#F8FAFC] dark:bg-[#121212] transition-colors duration-200">
          <div className="max-w-7xl mx-auto w-full min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
