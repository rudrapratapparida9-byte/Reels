import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import InstagramDownloader from './components/InstagramDownloader';
import AboutUs from './pages/AboutUs';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ContactUs from './pages/ContactUs';
import DmcaPolicy from './pages/DmcaPolicy';
import GuidesHub from './pages/GuidesHub';
import GuideArticle from './pages/GuideArticle';
import { GUIDES_DATA } from './data/guidesData';
import { ArrowDownToLine, BookOpen, ShieldCheck, Mail, FileText, Scale } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home' | 'guides' | 'guide-article' | 'about' | 'privacy' | 'terms' | 'contact' | 'dmca'
  const [activeGuideSlug, setActiveGuideSlug] = useState(null);
  const [activeCategory, setActiveCategory] = useState('reel'); // 'reel' | 'audio' | 'photo' | 'story' | 'cover'

  // Route matching from URL path
  const syncRouteFromPath = () => {
    const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';

    if (path === '' || path === '/') {
      setCurrentPage('home');
    } else if (path === '/guides' || path === '/blog') {
      setCurrentPage('guides');
    } else if (path.startsWith('/guides/')) {
      const slug = path.replace('/guides/', '');
      setActiveGuideSlug(slug);
      setCurrentPage('guide-article');
    } else if (path === '/about' || path === '/about-us') {
      setCurrentPage('about');
    } else if (path === '/privacy-policy' || path === '/privacy') {
      setCurrentPage('privacy');
    } else if (path === '/terms-of-service' || path === '/terms') {
      setCurrentPage('terms');
    } else if (path === '/contact' || path === '/contact-us') {
      setCurrentPage('contact');
    } else if (path === '/dmca' || path === '/dmca-policy' || path === '/disclaimer') {
      setCurrentPage('dmca');
    } else if (path === '/video' || path === '/reels') {
      setActiveCategory('reel');
      setCurrentPage('home');
    } else if (path === '/audio' || path === '/mp3') {
      setActiveCategory('audio');
      setCurrentPage('home');
    } else if (path === '/story' || path === '/stories') {
      setActiveCategory('story');
      setCurrentPage('home');
    } else if (path === '/photo' || path === '/photos') {
      setActiveCategory('photo');
      setCurrentPage('home');
    } else if (path === '/cover') {
      setActiveCategory('cover');
      setCurrentPage('home');
    } else {
      setCurrentPage('home');
    }
  };

  useEffect(() => {
    syncRouteFromPath();
    window.addEventListener('popstate', syncRouteFromPath);
    return () => window.removeEventListener('popstate', syncRouteFromPath);
  }, []);

  // Navigation handler with HTML5 pushState
  const navigateTo = (page, param = null) => {
    let newPath = '/';
    if (page === 'home') {
      newPath = '/';
    } else if (page === 'guides') {
      newPath = '/guides';
    } else if (page === 'guide-article') {
      newPath = `/guides/${param}`;
      setActiveGuideSlug(param);
    } else if (page === 'about') {
      newPath = '/about';
    } else if (page === 'privacy') {
      newPath = '/privacy-policy';
    } else if (page === 'terms') {
      newPath = '/terms-of-service';
    } else if (page === 'contact') {
      newPath = '/contact';
    } else if (page === 'dmca') {
      newPath = '/dmca';
    }

    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath);
    }
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-[#f8faff] text-slate-900 flex flex-col font-['Outfit'] antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* Top Navigation Bar */}
      <Header
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        currentPage={currentPage}
        onNavigate={navigateTo}
      />

      {/* Main Dynamic View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        
        {currentPage === 'home' && (
          <InstagramDownloader
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            onNavigate={navigateTo}
          />
        )}

        {currentPage === 'guides' && (
          <GuidesHub
            onNavigate={navigateTo}
            onSelectGuide={(slug) => navigateTo('guide-article', slug)}
          />
        )}

        {currentPage === 'guide-article' && (
          <GuideArticle
            slug={activeGuideSlug}
            onNavigate={navigateTo}
            onSelectGuide={(slug) => navigateTo('guide-article', slug)}
          />
        )}

        {currentPage === 'about' && (
          <AboutUs onNavigate={navigateTo} />
        )}

        {currentPage === 'privacy' && (
          <PrivacyPolicy onNavigate={navigateTo} />
        )}

        {currentPage === 'terms' && (
          <TermsOfService onNavigate={navigateTo} />
        )}

        {currentPage === 'contact' && (
          <ContactUs onNavigate={navigateTo} />
        )}

        {currentPage === 'dmca' && (
          <DmcaPolicy onNavigate={navigateTo} />
        )}

      </main>

      {/* Comprehensive Google AdSense-Compliant Multi-Column Footer */}
      <footer className="border-t border-slate-200/90 bg-white pt-12 pb-10 text-slate-600 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* 4-Column Directory Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            
            {/* Col 1: Brand & Overview */}
            <div className="space-y-3">
              <div 
                onClick={() => navigateTo('home')}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 p-[1.5px] shadow-sm">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <ArrowDownToLine className="w-4 h-4 text-white" />
                  </div>
                </div>
                <span className="text-lg font-black text-slate-900 font-['Outfit']">
                  Reels<span className="bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">Vault</span>
                </span>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">
                High-performance universal media analysis and extraction platform. Download 1080p Full HD MP4 videos, 320kbps MP3 audio, public stories, and creator analytics without watermarks.
              </p>
              <div className="text-[11px] text-slate-400 font-medium">
                100% Free • Zero Registration • SSL Encrypted
              </div>
            </div>

            {/* Col 2: Creator Tools */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Media Tools
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button 
                    onClick={() => { setActiveCategory('reel'); navigateTo('home'); }} 
                    className="hover:text-indigo-600 transition cursor-pointer"
                  >
                    Instagram Reels Downloader (1080p HD)
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => { setActiveCategory('audio'); navigateTo('home'); }} 
                    className="hover:text-indigo-600 transition cursor-pointer"
                  >
                    Reels Audio to MP3 Extractor (320kbps)
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => { setActiveCategory('story'); navigateTo('home'); }} 
                    className="hover:text-indigo-600 transition cursor-pointer"
                  >
                    Anonymous Story & Highlight Saver
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => { setActiveCategory('photo'); navigateTo('home'); }} 
                    className="hover:text-indigo-600 transition cursor-pointer"
                  >
                    High-Res Photo & Carousel Downloader
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => { setActiveCategory('cover'); navigateTo('home'); }} 
                    className="hover:text-indigo-600 transition cursor-pointer"
                  >
                    Reel Cover & Thumbnail HD Extractor
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Educational Guides */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                Creator Guides
              </h4>
              <ul className="space-y-2 text-xs">
                {GUIDES_DATA.map((guide) => (
                  <li key={guide.slug}>
                    <button
                      onClick={() => navigateTo('guide-article', guide.slug)}
                      className="text-left hover:text-indigo-600 transition line-clamp-1 cursor-pointer"
                    >
                      {guide.title}
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    onClick={() => navigateTo('guides')}
                    className="text-indigo-600 font-bold hover:underline cursor-pointer inline-flex items-center gap-1 pt-1"
                  >
                    View All Technical Guides →
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4: Legal & Support */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                Legal & Company
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button 
                    onClick={() => navigateTo('privacy')} 
                    className="hover:text-indigo-600 transition cursor-pointer"
                  >
                    Privacy Policy (GDPR & AdSense)
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigateTo('terms')} 
                    className="hover:text-indigo-600 transition cursor-pointer"
                  >
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigateTo('dmca')} 
                    className="hover:text-indigo-600 transition cursor-pointer"
                  >
                    DMCA Copyright Policy
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigateTo('about')} 
                    className="hover:text-indigo-600 transition cursor-pointer"
                  >
                    About Us & Infrastructure
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigateTo('contact')} 
                    className="hover:text-indigo-600 transition cursor-pointer"
                  >
                    Contact & Engineering Support
                  </button>
                </li>
              </ul>
            </div>

          </div>

          {/* Legal Disclaimer Bar */}
          <div className="pt-8 border-t border-slate-200/80 text-[11px] text-slate-400 space-y-2 text-center max-w-4xl mx-auto">
            <p>
              <strong>Disclaimer:</strong> ReelsVault is an independent educational media utility and is not affiliated, associated, authorized, endorsed by, or in any way officially connected with Instagram, Meta Platforms, Inc., or Facebook. All media copyrights, trademarks, and intellectual properties belong to their respective creators.
            </p>
            <div className="text-[10px] text-slate-400 pt-1">
              © {new Date().getFullYear()} ReelsVault. All rights reserved. • Hosted on High-Speed Cloud Infrastructure
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
