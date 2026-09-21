import React from 'react';

/**
 * CleanAdBanner - Google AdSense Compliant Banner Unit
 * Compliant with Google Publisher policies:
 * - 0 fake mock advertisements or deceptive click targets
 * - Renders live Google AdSense ad slot if provided
 * - Gracefully hides when no live ad slot is active to prevent "screens without publisher content" flags
 */
export default function CleanAdBanner({ 
  type = 'leaderboard', // 'leaderboard' (728x90) or 'rectangle' (300x250)
  adClient = 'ca-pub-6931746397574530',
  adSlot = '',
  className = '' 
}) {
  // If no live ad slot is active, don't render empty placeholders to avoid policy violations
  if (!adSlot) {
    return null;
  }

  return (
    <div className={`w-full max-w-4xl mx-auto my-6 px-2 sm:px-4 flex flex-col items-center ${className}`}>
      {/* Subtle Ad Label */}
      <div className="w-full flex items-center justify-between text-[10px] font-medium text-slate-400 mb-1 px-1">
        <span className="uppercase tracking-widest text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
          Advertisement
        </span>
        <span className="text-[10px] text-slate-400">
          Google Ads
        </span>
      </div>

      {/* AdSense Unit */}
      <div className="w-full bg-white border border-slate-200/80 rounded-2xl overflow-hidden min-h-[90px] flex items-center justify-center">
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', minHeight: type === 'leaderboard' ? '90px' : '250px' }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}
