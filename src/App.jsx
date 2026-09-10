import React, { useState } from 'react';
import Header from './components/Header';
import InstagramDownloader from './components/InstagramDownloader';
import PolicyModals from './components/PolicyModals';

export default function App() {
  const [activeCategory, setActiveCategory] = useState('reel'); // 'reel' | 'audio' | 'photo'
  const [activeModal, setActiveModal] = useState(null); // 'privacy' | 'terms' | 'about' | 'contact' | null

  return (
    <div className="min-h-screen bg-[#f8faff] text-slate-900 flex flex-col font-['Outfit'] antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Header */}
      <Header
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <InstagramDownloader
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
        />
      </main>

      {/* Google AdSense Compliant Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-10 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <div className="flex items-center justify-center gap-2 text-slate-800 font-extrabold text-sm">
            <span>ReelsVault</span>
            <span className="text-slate-300">•</span>
            <span>Ultra Fast Instagram Media Downloader</span>
          </div>

          {/* AdSense Policy Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-600">
            <button
              onClick={() => setActiveModal('about')}
              className="hover:text-indigo-600 hover:underline transition"
            >
              About Us
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => setActiveModal('privacy')}
              className="hover:text-indigo-600 hover:underline transition"
            >
              Privacy Policy
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => setActiveModal('terms')}
              className="hover:text-indigo-600 hover:underline transition"
            >
              Terms of Service
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => setActiveModal('contact')}
              className="hover:text-indigo-600 hover:underline transition"
            >
              Contact Us
            </button>
          </div>

          <p className="text-slate-500 text-xs">
            100% Free, Unlimited & Anonymous • 1080p Full HD MP4 Video • 320kbps MP3 Audio • Lossless JPG Photos
          </p>

          <p className="text-[11px] text-slate-400 max-w-2xl mx-auto">
            ReelsVault is an independent educational media tool and is not affiliated with Instagram or Meta Platforms, Inc. All trademarks and media copyrights belong to their respective creators.
          </p>

          <div className="text-[10px] text-slate-400 pt-2">
            © {new Date().getFullYear()} ReelsVault. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Policy Modals */}
      <PolicyModals
        isOpen={Boolean(activeModal)}
        modalType={activeModal}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
