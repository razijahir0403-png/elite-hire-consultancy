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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop blur with deep teal tint */}
      <div 
        className="fixed inset-0 bg-[#043845]/45 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card with smooth scale/fade-in */}
      <div className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-[0_20px_50px_rgba(7,86,106,0.18)] overflow-hidden border border-[#D8E9E2] transition-all duration-300 transform scale-100 animate-fade-in-up`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8E9E2] bg-gradient-to-r from-[#F4FBF8] to-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-1.5 h-4.5 rounded-full bg-gradient-to-b from-[#00E99A] to-[#00B96B]" />
            <h3 className="text-base font-extrabold text-[#07566A] tracking-tight font-sans">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#526B70] hover:text-[#07566A] hover:bg-[#D5F5E7] p-1.5 rounded-xl transition-all"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 max-h-[75vh] overflow-y-auto text-[#07566A]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
