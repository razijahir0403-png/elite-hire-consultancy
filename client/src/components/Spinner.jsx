import React from 'react';

const Spinner = ({ size = 'medium', fullPage = false }) => {
  const sizeClasses = {
    small: 'h-6 w-6 border-2',
    medium: 'h-12 w-12 border-[3px]',
    large: 'h-16 w-16 border-4'
  };

  const spinnerContent = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        {/* Outer brand-themed premium rotating ring */}
        <div className={`animate-spin rounded-full border-slate-200 border-t-brand-800 ${sizeClasses[size]}`} />
        <div className="absolute inset-0 rounded-full blur-xs opacity-30 border border-brand-100" />
      </div>
      {fullPage && (
        <span className="text-xs font-semibold tracking-widest text-slate-600 uppercase animate-pulse">
          Loading Elite Hire...
        </span>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/85 backdrop-blur-md">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

export default Spinner;
