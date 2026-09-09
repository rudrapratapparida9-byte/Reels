import React from 'react';

/**
 * AdBanner Component
 * Supports Google AdSense, Adsterra, Monetag, and custom banner ads.
 * Easily switch between display formats: 'top-leaderboard', 'in-feed', 'sidebar', 'rectangle'.
 */
export default function AdBanner({ 
  format = 'in-feed', 
  adClient = '', // e.g. 'ca-pub-XXXXXXXXXXXXXXXX'
  adSlot = '',   // e.g. '1234567890'
  className = '' 
}) {
  // If real AdSense credentials are provided, render the live script unit
  const hasLiveAdSense = adClient && adSlot;

  return (
    <div className={`w-full max-w-4xl mx-auto my-6 px-4 ${className}`}>
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 p-4 sm:p-6 text-center transition-all hover:border-indigo-300">
        
        {/* Small Ad Label */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded-md border border-slate-150">
            Advertisement
          </span>
          <span className="text-[10px] text-slate-400 hover:text-slate-600 transition cursor-pointer">
            Ad Choices ⓘ
          </span>
        </div>

        {hasLiveAdSense ? (
          // Live Google AdSense Container
          <ins 
            className="adsbygoogle"
            style={{ display: 'block', minHeight: format === 'top-leaderboard' ? '90px' : '250px' }}
            data-ad-client={adClient}
            data-ad-slot={adSlot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        ) : (
          // High-Converting Monetization Placement Container
          <div className="py-4 sm:py-6 flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-lg mb-1 shadow-xs">
              💰
            </div>
            <h4 className="text-sm sm:text-base font-bold text-slate-700">
              {format === 'top-leaderboard' ? 'Premium Banner Ad Space' : 'Sponsored Placement'}
            </h4>
            <p className="text-xs text-slate-500 max-w-md">
              Google AdSense, Adsterra & Monetag ad units will display here to generate revenue per 1,000 visitors.
            </p>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              High CPM Responsive Slot (728x90 / 300x250)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
