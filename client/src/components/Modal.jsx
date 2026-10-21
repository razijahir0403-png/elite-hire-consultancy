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
      {/* Backdrop blur with deep teal tint */}
      <div 
        className="fixed inset-0 bg-[#043845]/45 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card with smooth scale/fade-in */}
      <div className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-[0_20px_50px_rgba(7,86,106,0.18)] overflow-hidden border border-[#D8E9E2] transition-all duration-300 transform scale-100 animate-fade-in-up max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#D8E9E2] bg-gradient-to-r from-[#F4FBF8] to-white flex-shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-1.5 h-4.5 rounded-full bg-gradient-to-b from-[#00E99A] to-[#00B96B] flex-shrink-0" />
            <h3 className="text-sm sm:text-base font-extrabold text-[#07566A] tracking-tight font-sans truncate">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#526B70] hover:text-[#07566A] hover:bg-[#D5F5E7] p-1.5 rounded-xl transition-all flex-shrink-0 cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto text-[#07566A] flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
