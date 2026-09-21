import React from 'react';
import { ArrowDownToLine, BookOpen, Info, Mail, Video, Music, Image as ImageIcon, Layers } from 'lucide-react';

export default function Header({ 
  activeCategory = 'reel',
  setActiveCategory,
  currentPage = 'home',
  onNavigate
}) {
  const tabs = [
    { id: 'reel', label: 'Reels Video', icon: Video, badge: '1080p' },
    { id: 'story', label: 'Stories', icon: BookOpen, badge: 'Anon' },
    { id: 'photo', label: 'Photos', icon: ImageIcon, badge: 'HD' },
    { id: 'audio', label: 'Audio MP3', icon: Music, badge: '320k' },
    { id: 'cover', label: 'Cover', icon: Layers, badge: 'JPG' }
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-2xl border-b border-slate-200/80 px-4 sm:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        
        {/* Brand Logo: ReelsVault */}
        <div 
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6366f1] via-[#8b5cf6] to-[#ec4899] p-[2px] shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-all">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 to-pink-500/30 opacity-70" />
              <ArrowDownToLine className="w-5 h-5 text-white relative z-10 group-hover:translate-y-0.5 transition-transform" />
            </div>
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-black tracking-tight font-['Outfit'] text-slate-900">
                Reels<span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Vault</span>
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black tracking-wider border border-indigo-200/60 uppercase">
                PRO
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium -mt-1 tracking-wide">
              Creator Media & Educational Hub
            </span>
          </div>
        </div>

        {/* Center/Right Navigation: Tool Tabs & Site Sections */}
        <div className="flex flex-wrap items-center gap-2 max-w-full overflow-x-auto justify-center">
          
          {/* Tool Segmented Tabs */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/90 shadow-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentPage === 'home' && (activeCategory === tab.id || (tab.id === 'reel' && activeCategory === 'video'));
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveCategory(tab.id);
                    onNavigate('home');
                  }}
                  className={`relative px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Navigation Links: Guides, About, Contact */}
          <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
            <button
              onClick={() => onNavigate('guides')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentPage === 'guides' || currentPage === 'guide-article'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Guides</span>
            </button>

            <button
              onClick={() => onNavigate('about')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentPage === 'about'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Info className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">About</span>
            </button>

            <button
              onClick={() => onNavigate('contact')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentPage === 'contact'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Contact</span>
            </button>
          </div>

        </div>

      </div>
    </header>
  );
}
