import React from 'react';

/**
 * CleanAdBanner - FastVideoSave.net Style Clean Display Ads
 * Exactly matches fastvideosave.net's ad styling:
 * - 0 annoying popups or redirects
 * - Clean white card border with subtle "Advertisement" tag
 * - Standard IAB sizes: 728x90 Leaderboard & 300x250 / 336x280 Rectangle
 * - Ready for Google AdSense or clean banner networks
 */
export default function CleanAdBanner({ 
  type = 'leaderboard', // 'leaderboard' (728x90) or 'rectangle' (300x250) or 'native'
  slotId = '',
  className = '' 
}) {
  return (
    <div className={`w-full max-w-4xl mx-auto my-6 px-2 sm:px-4 flex flex-col items-center ${className}`}>
      
      {/* FastVideoSave style subtle AD label */}
      <div className="w-full flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1.5 px-1">
        <span className="uppercase tracking-widest text-[10px] font-semibold text-slate-400 bg-slate-100/80 px-2 py-0.5 rounded">
          Advertisement
        </span>
        <span className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer">
          ⓘ Ad Choices
        </span>
      </div>

      {/* Ad Card Container */}
      <div className="w-full bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition-all hover:border-slate-300">
        
        {type === 'leaderboard' ? (
          // 728x90 Responsive Leaderboard (fastvideosave top ad style)
          <div className="w-full min-h-[90px] sm:min-h-[110px] flex flex-col sm:flex-row items-center justify-between p-4 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                ⚡
              </div>
              <div className="text-left space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    Featured
                  </span>
                  <span className="text-xs font-semibold text-slate-500">Fast Cloud Storage</span>
                </div>
                <h4 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                  100GB Free Secure Cloud Backup — Zero Setup
                </h4>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Automatic cross-device sync for mobile, desktop & tablet.
                </p>
              </div>
            </div>

            <a
              href="#download-section"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm text-center shadow-md shadow-indigo-500/20 transition-all shrink-0 cursor-pointer"
            >
              Learn More →
            </a>
          </div>
        ) : (
          // 300x250 Medium Rectangle (fastvideosave in-content style)
          <div className="w-full min-h-[180px] sm:min-h-[220px] flex flex-col items-center justify-center p-6 bg-gradient-to-b from-white to-slate-50/60 text-center space-y-3">
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              ⚡ High-Speed Video Tools
            </span>
            <h4 className="text-base sm:text-lg font-black text-slate-900 max-w-md">
              AI Video Enhancer & 4K Upscaler Online
            </h4>
            <p className="text-xs text-slate-500 max-w-sm">
              Automatically enhance blurry videos to crystal clear 4K 60FPS in one click.
            </p>
            <a
              href="#download-section"
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              Try Free Online →
            </a>
          </div>
        )}

      </div>
    </div>
  );
}
