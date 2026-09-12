import React, { useState } from 'react';
import { ShieldCheck, FileText, Mail, Info, X, ExternalLink } from 'lucide-react';

export default function PolicyModals({ isOpen, modalType, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2 font-bold text-lg text-slate-900">
            {modalType === 'privacy' && <ShieldCheck className="w-5 h-5 text-indigo-600" />}
            {modalType === 'terms' && <FileText className="w-5 h-5 text-indigo-600" />}
            {modalType === 'contact' && <Mail className="w-5 h-5 text-indigo-600" />}
            {modalType === 'about' && <Info className="w-5 h-5 text-indigo-600" />}
            
            <span>
              {modalType === 'privacy' && 'Privacy Policy'}
              {modalType === 'terms' && 'Terms of Service'}
              {modalType === 'contact' && 'Contact Us'}
              {modalType === 'about' && 'About ReelsVault'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm leading-relaxed text-slate-600">
          {modalType === 'privacy' && (
            <>
              <p className="font-semibold text-slate-900">Last updated: September 2026</p>
              <p>
                Welcome to ReelsVault. We respect your privacy and are committed to protecting any personal data. This Privacy Policy explains how our service collects, uses, and safeguards information when you visit our website.
              </p>

              <h4 className="font-bold text-slate-900 pt-2">1. Information We Do Not Collect</h4>
              <p>
                ReelsVault is an anonymous media utility. We do not require account registration, login credentials, or personal identification. We do not store downloaded videos, audio files, or user media on our permanent servers.
              </p>

              <h4 className="font-bold text-slate-900 pt-2">2. Google AdSense & Third-Party Advertising</h4>
              <p>
                We use Google AdSense to serve advertisements when you visit our website. Google and its partner advertising networks may use cookies (such as the DoubleClick DART cookie) to serve ads based on your visit to this site and other websites on the Internet.
              </p>
              <p>
                Users may opt out of personalized advertising by visiting the <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium inline-flex items-center gap-1">Google Ads Settings <ExternalLink className="w-3 h-3" /></a> or by visiting <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium inline-flex items-center gap-1">aboutads.info <ExternalLink className="w-3 h-3" /></a>.
              </p>

              <h4 className="font-bold text-slate-900 pt-2">3. Log Files & Analytics</h4>
              <p>
                Like most standard websites, we use standard server log files to monitor traffic trends, administer the site, and protect against malicious abuse. These logs include IP addresses, browser types, internet service providers (ISP), referring/exit pages, and date/time stamps. None of this information is linked to personally identifiable information.
              </p>

              <h4 className="font-bold text-slate-900 pt-2">4. Cookies</h4>
              <p>
                Cookies are small files stored on your computer by your browser. We and our third-party advertising partners use cookies to understand usage and enhance your browsing experience. You can choose to disable cookies through your individual browser settings.
              </p>
            </>
          )}

          {modalType === 'terms' && (
            <>
              <p className="font-semibold text-slate-900">Last updated: September 2026</p>
              <p>
                By accessing and using ReelsVault, you agree to comply with and be bound by the following terms and conditions of use.
              </p>

              <h4 className="font-bold text-slate-900 pt-2">1. Permitted Use</h4>
              <p>
                ReelsVault is intended exclusively for personal, non-commercial, and educational purposes. You agree not to use this service to infringe upon the intellectual property rights or copyright of any creator or entity.
              </p>

              <h4 className="font-bold text-slate-900 pt-2">2. Intellectual Property Rights</h4>
              <p>
                All videos, audio tracks, and images downloaded through this tool remain the copyrighted property of their respective creators and copyright holders. ReelsVault does not claim ownership over any third-party media.
              </p>

              <h4 className="font-bold text-slate-900 pt-2">3. Disclaimer of Affiliation</h4>
              <p>
                ReelsVault is an independent web application and is not endorsed, sponsored, affiliated, or associated with Instagram, Meta Platforms, Inc., or any of their subsidiaries.
              </p>

              <h4 className="font-bold text-slate-900 pt-2">4. Limitation of Liability</h4>
              <p>
                This service is provided "as is" without warranty of any kind, express or implied. In no event shall ReelsVault be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the service.
              </p>
            </>
          )}

          {modalType === 'contact' && (
            <>
              <p>
                Have questions, bug reports, DMCA notices, or partnership inquiries? We are here to help.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 my-3 space-y-2">
                <div className="font-semibold text-slate-900">Official Support Email:</div>
                <div className="text-indigo-600 font-mono text-sm select-all">contact.reelsvault@gmail.com</div>
                <div className="text-xs text-slate-500">We typically respond to all inquiries within 24–48 business hours.</div>
              </div>
              <p>
                If you are a copyright holder and wish to submit a takedown request, please provide the specific URL(s) and proof of copyright ownership in your email.
              </p>
            </>
          )}

          {modalType === 'about' && (
            <>
              <p>
                <strong>ReelsVault</strong> is a high-speed web utility designed to help creators, researchers, and media enthusiasts easily download and archive high-quality Instagram Reels, 320kbps MP3 audio, and public stories.
              </p>
              <h4 className="font-bold text-slate-900 pt-2">Key Features:</h4>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>Original 1080p Full HD MP4 Video extraction</li>
                <li>Crystal clear 320kbps MP3 Audio conversion</li>
                <li>No watermarks or compression quality loss</li>
                <li>100% Free, Unlimited, and requiring zero login or registration</li>
              </ul>
              <p className="pt-2">
                Our infrastructure uses high-performance edge streaming servers to ensure rapid downloads with maximum uptime.
              </p>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
