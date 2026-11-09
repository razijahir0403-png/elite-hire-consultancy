import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop blur with deep teal / black tint */}
      <div 
        className="fixed inset-0 bg-[#043845]/45 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card with smooth scale/fade-in */}
      <div className={`relative w-full ${maxWidth} bg-white dark:bg-[#1E293B] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden border border-[#B8C0CC] dark:border-[#475569] transition-all duration-300 transform scale-100 animate-fade-in-up max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#B8C0CC] dark:border-[#475569] bg-[#F8FAFC] dark:bg-[#1E293B] flex-shrink-0 transition-colors duration-200">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-1.5 h-4.5 rounded-full bg-gradient-to-b from-[#00E99A] to-[#00B96B] flex-shrink-0" />
            <h3 className="text-sm sm:text-base font-extrabold text-[#111827] dark:text-[#FFFFFF] tracking-tight font-sans truncate">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#374151] dark:text-[#E2E8F0] hover:text-[#111827] dark:hover:text-[#FFFFFF] hover:bg-[#E5E7EB] dark:hover:bg-[#121212] p-1.5 rounded-xl transition-all flex-shrink-0 cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto text-[#111827] dark:text-[#F8FAFC] flex-1 min-h-0 transition-colors duration-200">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
