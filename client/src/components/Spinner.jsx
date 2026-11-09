import React from 'react';
import ThreeBarLogo from './ThreeBarLogo';

/**
 * Spinner — Reusable brand loader using the Eleventis
 * three ascending green bars animation.
 */
const Spinner = ({ size = 'medium', fullPage = false, text = 'Loading...' }) => {
  const logoSizes = {
    small: 'xs',
    medium: 'md',
    large: 'lg',
  };

  const spinnerContent = (
    <div className="flex flex-col items-center justify-center space-y-3">
      {/* Animated Three Ascending Green Bars */}
      <div className="relative p-2 rounded-2xl bg-white/80 dark:bg-[#16202E]/80 border border-[#D8E9E2] dark:border-[#273548] shadow-[0_4px_20px_rgba(0,185,107,0.15)] backdrop-blur-xs transition-colors duration-200">
        <ThreeBarLogo size={logoSizes[size] || 'md'} animated={true} />
      </div>

      {fullPage && (
        <div className="flex flex-col items-center text-center space-y-1">
          <span className="text-xs font-bold tracking-widest text-[#07566A] dark:text-emerald-300 uppercase animate-pulse">
            {text}
          </span>
          <span className="text-[10px] font-extrabold tracking-widest text-[#00B96B] dark:text-emerald-400 uppercase">
            Data • Talent • Solutions
          </span>
        </div>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#EAF8F3]/90 dark:bg-[#0F172A]/90 backdrop-blur-md transition-colors duration-200">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

export default Spinner;
