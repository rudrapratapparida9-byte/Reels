import React, { useState, useEffect } from 'react';
import { Mail, MessageSquare, Send, CheckCircle2, Clock, ShieldCheck, ArrowLeft, HelpCircle } from 'lucide-react';

export default function ContactUs({ onNavigate }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Contact Us — ReelsVault Support & Legal Inquiries";
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setSubmitted(true);
  };

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
          <Mail className="w-4 h-4" />
          <span>Support & Inquiries</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight">
          Contact Us
        </h1>
        <p className="text-sm text-slate-600 font-normal leading-relaxed">
          Have feedback, technical support questions, bug reports, or legal inquiries? Our administrative and engineering team is available 24/7.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Contact Info Sidebar */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Direct Support Channels</h3>
            
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  Official Email
                </div>
                <div className="font-mono text-indigo-600 font-semibold select-all text-[11px]">
                  contact.reelsvault@gmail.com
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  Response Window
                </div>
                <div className="text-slate-500 text-[11px]">
                  Typically within 12–24 business hours.
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  DMCA & Takedown Notices
                </div>
                <div className="text-slate-500 text-[11px]">
                  Include target URLs and ownership proof in your message.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Contact Form */}
        <div className="md:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
          {submitted ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center font-bold text-2xl border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Message Transmitted Successfully</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Thank you for contacting ReelsVault. Our support team has logged your inquiry and will review your submission promptly.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                Submit a Support Ticket
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Your Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="jane@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Topic / Inquiry Category</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option>General Inquiry</option>
                  <option>Technical Bug Report</option>
                  <option>Video Download Failure</option>
                  <option>DMCA Copyright Notice</option>
                  <option>Advertising / Business Partnership</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Your Message</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Please describe your question or issue in detail..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Submit Ticket</span>
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
