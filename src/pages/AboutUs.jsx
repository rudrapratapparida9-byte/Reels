import React, { useEffect } from 'react';
import { Info, Sparkles, Cpu, ShieldCheck, Zap, Users, ArrowLeft, Award, Server } from 'lucide-react';

export default function AboutUs({ onNavigate }) {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "About Us — ReelsVault Media Infrastructure";
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-fadeIn">
      {/* Breadcrumb / Back Navigation */}
      <button 
        onClick={() => onNavigate('home')}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition group cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Downloader</span>
      </button>

      {/* Hero Banner */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200/60">
          <Info className="w-4 h-4" />
          <span>Our Mission & Architecture</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight">
          About ReelsVault
        </h1>
        <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
          ReelsVault is a high-speed, modern media processing engine designed for creators, editors, researchers, and media professionals seeking pristine 1080p video extraction, 320kbps audio isolation, and creator analytics.
        </p>
      </div>

      {/* Main Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-black">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Zero Loss Direct Stream</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Our edge cluster connects directly to public CDN streams, guaranteeing 100% original 1080p 60FPS bitrates with 0 watermarks and zero secondary compression loss.
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-black">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">320kbps Audio Mastering</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            We extract embedded AAC streams and transcode them cleanly into broadcast-grade 320kbps MP3 tracks sampled at 48.0 kHz for professional video editing workflows.
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Privacy-First Architecture</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            No accounts, no tracking pixels, and no temporary media storage. All operations happen in real-time stream memory, maintaining absolute user anonymity.
          </p>
        </div>
      </div>

      {/* Detailed Technical Story */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs space-y-6 text-slate-700 leading-relaxed text-sm">
        <h2 className="text-2xl font-black text-slate-900 font-['Outfit']">
          Why We Built ReelsVault
        </h2>
        <p>
          Video editors and social media managers frequently face severe hurdles when attempting to archive or analyze digital content. Standard web tools are often riddled with deceptive redirects, low-resolution 480p downsampling, forced paywalls, and intrusive popup ads that compromise the user experience.
        </p>
        <p>
          We engineered ReelsVault as a clean, lightning-fast alternative:
        </p>

        <div className="space-y-4 pt-2">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">✓</div>
            <div>
              <strong className="text-slate-900">Modern Open-Source Engine:</strong> Powered by Node.js, Express, FFmpeg core libraries, and optimized Python stream parsers to ensure 99.9% uptime.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">✓</div>
            <div>
              <strong className="text-slate-900">Educational Publisher Hub:</strong> Alongside our media utility, we publish comprehensive research guides on video bitrate optimization, creator copyright laws, audio post-production, and social media safe zones.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">✓</div>
            <div>
              <strong className="text-slate-900">AdSense & Policy Compliant:</strong> We strictly adhere to clean advertising standards, providing clear, non-intrusive value without deceptive popups or misleading UI overlays.
            </div>
          </div>
        </div>

        {/* Quick Links CTA */}
        <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <button
            onClick={() => onNavigate('guides')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
          >
            Explore Creator Guides & Tutorials →
          </button>
          
          <button
            onClick={() => onNavigate('contact')}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
          >
            Contact Engineering Support
          </button>
        </div>
      </div>
    </div>
  );
}
