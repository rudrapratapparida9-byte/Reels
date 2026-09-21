import React from 'react';

/**
 * AdBanner Component - Google AdSense Compliant Unit
 * Avoids empty placeholder boxes and misleading mock ads
 */
export default function AdBanner({ 
  format = 'in-feed', 
  adClient = 'ca-pub-6931746397574530',
  adSlot = '',   
  className = '' 
}) {
  // Hide completely if no live ad slot is supplied to prevent "screens without publisher content" violations
  if (!adSlot) {
    return null;
  }

  return (
    <div className={`w-full max-w-4xl mx-auto my-6 px-4 ${className}`}>
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-center">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
            Advertisement
          </span>
        </div>

        <ins 
          className="adsbygoogle"
          style={{ display: 'block', minHeight: format === 'top-leaderboard' ? '90px' : '250px' }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}
