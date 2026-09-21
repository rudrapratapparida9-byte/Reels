import React, { useEffect } from 'react';
import { ShieldAlert, Scale, Mail, AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function DmcaPolicy({ onNavigate }) {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "DMCA Copyright Policy — ReelsVault";
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
          <ShieldAlert className="w-4 h-4" />
          <span>Copyright Compliance</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight">
          DMCA Copyright & Takedown Policy
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Digital Millennium Copyright Act (17 U.S.C. § 512) Notification Procedure
        </p>
      </div>

      {/* Policy Content */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8 text-slate-700 leading-relaxed text-sm">
        
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-600" />
            1. Respect for Intellectual Property
          </h2>
          <p>
            ReelsVault respects the intellectual property rights of others and expects our users to do the same. In accordance with the Digital Millennium Copyright Act of 1998 (DMCA), we respond expeditiously to valid copyright infringement notices submitted to our designated copyright agent.
          </p>
          <p>
            <strong>Important Technical Note:</strong> ReelsVault does not host, upload, or store user media files on its servers. All media streams processed by this service are delivered directly in real-time from Instagram's publicly accessible CDN servers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-indigo-600" />
            2. Filing a Formal DMCA Takedown Notice
          </h2>
          <p>
            If you are a copyright owner, or an agent authorized to act on behalf of one, and you believe in good faith that any content accessible or linked through ReelsVault infringes upon your copyright, please transmit a written notification containing:
          </p>
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 space-y-2 text-xs sm:text-sm">
            <ul className="list-decimal list-inside space-y-2 text-slate-600">
              <li>A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
              <li>Identification of the copyrighted work claimed to have been infringed (e.g., original publication URL or registration number).</li>
              <li>Identification of the material that is claimed to be infringing and information reasonably sufficient to permit us to locate the material (the specific Instagram URL).</li>
              <li>Information reasonably sufficient to permit us to contact you, such as an address, telephone number, and valid email address.</li>
              <li>A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
              <li>A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the copyright owner.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600" />
            3. Designated Copyright Agent Contact Information
          </h2>
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
            <div className="font-bold text-slate-900">Designated Agent: ReelsVault DMCA Compliance Officer</div>
            <div className="text-xs text-slate-600">Email: <span className="font-mono font-bold text-indigo-700 select-all">contact.reelsvault@gmail.com</span></div>
            <div className="text-xs text-slate-500">Subject Line: <em>"DMCA Copyright Takedown Request - [Content Identifier]"</em></div>
          </div>
        </section>

      </div>
    </div>
  );
}
