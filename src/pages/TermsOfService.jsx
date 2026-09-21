import React, { useEffect } from 'react';
import { FileText, CheckCircle2, AlertTriangle, ShieldAlert, ArrowLeft, Scale, Globe, BookOpen } from 'lucide-react';

export default function TermsOfService({ onNavigate }) {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Terms of Service — ReelsVault";
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

      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200/60">
          <FileText className="w-4 h-4" />
          <span>Terms & Conditions</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight">
          Terms of Service
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Effective Date: September 21, 2026 • Universal User Agreement & Acceptable Use Policy
        </p>
      </div>

      {/* Policy Content */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8 text-slate-700 leading-relaxed text-sm">
        
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-600" />
            1. Acceptance of Terms
          </h2>
          <p>
            Welcome to ReelsVault. By browsing, accessing, or using this website (<code>https://reels-1-nvfo.onrender.com</code>) or any associated API endpoints, you agree to be bound by these Terms of Service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            2. Permitted Use and Fair Use Guidelines
          </h2>
          <p>
            ReelsVault is intended strictly as an educational media analysis tool, creator utility, and personal offline content archiver. You agree to use the service only for:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2 text-slate-600">
            <li>Personal, non-commercial media viewing and private educational study.</li>
            <li>Archiving your own original media creations, backups, and portfolio samples.</li>
            <li>Media analysis conforming to legal <strong>Fair Use</strong> and <strong>Fair Dealing</strong> exemptions (e.g., news reporting, educational critique, transformative parody).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            3. Intellectual Property Rights & Copyright Ownership
          </h2>
          <p>
            All media content (including videos, audio recordings, musical compositions, photographs, and captions) processed through this tool remain the sole intellectual property of their respective creators and copyright owners.
          </p>
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs sm:text-sm space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> User Responsibility Notice:
            </p>
            <p>
              ReelsVault does not claim any copyright or proprietary interest in third-party content. You are solely responsible for obtaining any required permissions or licenses before publicly distributing, broadcasting, or commercially monetizing any downloaded content.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            4. Third-Party Platform Disclaimer
          </h2>
          <p>
            ReelsVault is an independent project and is not affiliated, authorized, endorsed by, or in any way officially connected with <strong>Instagram</strong>, <strong>Meta Platforms, Inc.</strong>, Facebook, or any of their affiliates or subsidiaries. The official Instagram website can be found at <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-bold">instagram.com</a>.
          </p>
          <p>
            All Instagram-related trademarks, trade dress, and service marks are the registered property of Meta Platforms, Inc.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            5. Disclaimer of Warranties and Limitation of Liability
          </h2>
          <p>
            The service is provided on an <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> basis without warranties of any kind, whether express or implied. ReelsVault makes no guarantees that:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 text-slate-600">
            <li>The service will be uninterrupted, error-free, or perpetually available.</li>
            <li>The results obtained from the use of the service will be entirely error-free or compatible with all third-party media players.</li>
          </ul>
          <p className="pt-2">
            Under no legal theory shall ReelsVault or its operators be liable for direct, indirect, consequential, or exemplary damages arising from your access or use of this tool.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-600" />
            6. DMCA & Takedown Inquiries
          </h2>
          <p>
            If you believe content indexed or accessible through our utility violates your copyright, please consult our dedicated <button onClick={() => onNavigate('dmca')} className="text-indigo-600 font-bold underline cursor-pointer">DMCA Policy</button> or email our copyright agent directly at <span className="font-mono font-bold text-indigo-700">contact.reelsvault@gmail.com</span>.
          </p>
        </section>

      </div>
    </div>
  );
}
