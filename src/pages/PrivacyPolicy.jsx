import React, { useEffect } from 'react';
import { ShieldCheck, Lock, Eye, Cookie, Globe, RefreshCw, Mail, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy({ onNavigate }) {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Privacy Policy — ReelsVault";
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
          <ShieldCheck className="w-4 h-4" />
          <span>Official Legal Document</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Effective Date: September 21, 2026 • Compliant with GDPR, CCPA & Google AdSense Publisher Policies
        </p>
      </div>

      {/* Policy Content */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8 text-slate-700 leading-relaxed text-sm">
        
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            1. Overview and Commitment to User Privacy
          </h2>
          <p>
            At <strong>ReelsVault</strong> ("we", "our", or "us", operating at <code>https://reels-1-nvfo.onrender.com</code>), we prioritize user confidentiality and privacy rights. This Privacy Policy details the types of information we collect, how that data is processed, how cookies and third-party advertising services operate, and your statutory data protection rights under international data regulations, including the General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA).
          </p>
          <p>
            By using ReelsVault, you acknowledge and consent to the data practices described in this document. If you do not agree with any terms, please discontinue use of the service immediately.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-600" />
            2. Personal Information We Do NOT Collect
          </h2>
          <p>
            ReelsVault is engineered as an anonymous media processing utility. We strictly follow data minimization principles:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2 text-slate-600">
            <li><strong>No User Account Registration:</strong> We do not require users to register, log in, or provide names, physical addresses, telephone numbers, or financial information.</li>
            <li><strong>No Media Archival on Permanent Storage:</strong> Video, audio, or image streams fetched through our processing engine are streamed dynamically and are not stored in any permanent database or cloud repository.</li>
            <li><strong>No Instagram Credentials Requested:</strong> ReelsVault never requests your Instagram username, password, two-factor authentication tokens, or social media access tokens.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Cookie className="w-5 h-5 text-indigo-600" />
            3. Google AdSense & Third-Party Advertising Cookies
          </h2>
          <p>
            We partner with Google AdSense and authorized third-party ad networks to display advertisements on our website.
          </p>
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-2 text-xs sm:text-sm">
            <p className="font-semibold text-slate-900">Important Disclosures Regarding Google Advertising:</p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600">
              <li>Google, as a third-party vendor, uses cookies (including the DoubleClick cookie) to serve ads based on prior visits to our website or other sites across the Internet.</li>
              <li>Google's use of advertising cookies enables it and its partners to serve ads to users based on their browsing history.</li>
              <li>You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold underline">Google Ads Settings</a>.</li>
              <li>Alternatively, you can opt out of a third-party vendor's use of cookies for personalized advertising by visiting <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold underline">aboutads.info</a>.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-600" />
            4. Server Log Files & Technical Telemetry
          </h2>
          <p>
            Like virtually all web servers, ReelsVault logs standard technical telemetry in automated log files to monitor server uptime, mitigate DDoS attacks, and diagnose infrastructure health. This technical data includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
            <li>Internet Protocol (IP) addresses (anonymized/hashed for analytics)</li>
            <li>Browser type and version (User-Agent string)</li>
            <li>Referring and exit pages</li>
            <li>Date, time, and duration of requests</li>
            <li>HTTP response status codes and byte sizes</li>
          </ul>
          <p>
            Log telemetry is strictly used for server performance optimization, security monitoring, and rate limiting abuse. It is never sold or combined with external tracking databases.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            5. User Rights Under GDPR (European Union) & CCPA (California)
          </h2>
          <p>
            Depending on your geographic location, you possess statutory rights regarding data protection:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1.5">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-indigo-600">GDPR Protections (EU / UK)</h3>
              <p className="text-xs text-slate-600">The right of access, rectification, erasure ("right to be forgotten"), restriction of processing, data portability, and the right to object to automated profiling.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1.5">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-indigo-600">CCPA / CPRA Protections (California)</h3>
              <p className="text-xs text-slate-600">The right to know what categories of personal info are collected, the right to delete personal info, the right to opt-out of the sale or sharing of personal info, and freedom from discrimination.</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600" />
            6. Contacting Our Data Protection Officer
          </h2>
          <p>
            If you have questions, inquiries, or concerns regarding this Privacy Policy or cookie preferences, please contact our administrative team:
          </p>
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-slate-900">ReelsVault Privacy & Compliance Team</div>
              <div className="text-xs text-slate-600">Direct Inquiries: <span className="font-mono font-bold text-indigo-700">contact.reelsvault@gmail.com</span></div>
            </div>
            <button
              onClick={() => onNavigate('contact')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
            >
              Contact Page →
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
