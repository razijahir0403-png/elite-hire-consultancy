import React from 'react';

/**
 * ThreeBarLogo — Interactive animated three ascending bars inspired by
 * the Recruitix Analytica Solution logo.
 *
 * Gradients:
 *   linear-gradient(180deg, #00E99A 0%, #00B96B 100%)
 * Colors:
 *   Deep Teal: #07566A
 *   Brand Green: #00D98B
 */
const ThreeBarLogo = ({
  size = 'md',
  animated = true,
  showText = false,
  subtitle = true,
  className = '',
  textColor = 'text-ras-teal'
}) => {
  // Height and width configurations
  const dimensions = {
    xs: { h: 'h-6', w: 'w-6', barW: 'w-1.5', gap: 'gap-0.5', text: 'text-xs', sub: 'text-[8px]' },
    sm: { h: 'h-8', w: 'w-8', barW: 'w-2', gap: 'gap-1', text: 'text-sm', sub: 'text-[9px]' },
    md: { h: 'h-10', w: 'w-10', barW: 'w-2.5', gap: 'gap-1.5', text: 'text-base', sub: 'text-[10px]' },
    lg: { h: 'h-14', w: 'w-14', barW: 'w-3.5', gap: 'gap-2', text: 'text-xl', sub: 'text-xs' },
    xl: { h: 'h-20', w: 'w-20', barW: 'w-5', gap: 'gap-2.5', text: 'text-2xl', sub: 'text-sm' },
  };

  const config = dimensions[size] || dimensions.md;

  return (
    <div className={`inline-flex items-center space-x-3 ${className}`}>
      {/* Three Ascending Green Bars */}
      <div className={`relative flex items-end justify-center ${config.h} ${config.w} ${config.gap}`}>
        {/* Bar 1 (Shortest - Left) */}
        <div
          style={{ height: '48%' }}
          className={`${config.barW} rounded-full bg-gradient-to-b from-[#00E99A] to-[#00B96B] shadow-[0_2px_8px_rgba(0,217,139,0.35)] origin-bottom transition-transform duration-300 ${
            animated ? 'animate-bar-1' : ''
          }`}
          title="Recruitix Analytics Bar 1"
        />

        {/* Bar 2 (Medium - Middle) */}
        <div
          style={{ height: '74%' }}
          className={`${config.barW} rounded-full bg-gradient-to-b from-[#00E99A] to-[#00B96B] shadow-[0_2px_10px_rgba(0,217,139,0.4)] origin-bottom transition-transform duration-300 ${
            animated ? 'animate-bar-2' : ''
          }`}
          title="Recruitix Analytics Bar 2"
        />

        {/* Bar 3 (Tallest - Right) */}
        <div
          style={{ height: '100%' }}
          className={`${config.barW} rounded-full bg-gradient-to-b from-[#00E99A] to-[#00B96B] shadow-[0_2px_12px_rgba(0,217,139,0.45)] origin-bottom transition-transform duration-300 ${
            animated ? 'animate-bar-3' : ''
          }`}
          title="Recruitix Analytics Bar 3"
        />
      </div>

      {/* Optional Brand Typography */}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-black tracking-tight leading-none ${textColor} ${config.text}`}>
            Recruitix
          </span>
          <span className={`font-bold tracking-tight text-ras-teal/90 leading-tight ${config.text}`}>
            Analytica Solution
          </span>
          {subtitle && (
            <span className={`font-extrabold uppercase tracking-widest text-[#00B96B] mt-0.5 ${config.sub}`}>
              Data • Talent • Solutions
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ThreeBarLogo;
